import path from "path";
import fs from "fs";
import util from "util";
import puppeteer from "puppeteer";
import { Concurrency } from "./concurrency";
import { contentsCn } from "./constants";

interface Task {
  url: string;
  chapter: number;
  nameEn: string;
  nameCn: string;
  pathEn: string;
  pathCn: string;
}

class BibleSpider extends Concurrency<Task> {
  constructor(max: number) {
    super(max);
  }

  async downloadResource(task: Task, count: number) {
    if (count > 5) {
      return;
    }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setCookie({
      name: "bible",
      value: "2",
      domain: ".sj.jidujiao.com",
      path: "/",
    });

    await page.goto(task.url);

    const { chinese, english } = await page.evaluate(() => {
      const resultchinese: string[] = [];
      const resultenglish: string[] = [];
      const texts = document.querySelectorAll(".body ul p");
      texts.forEach((text) => {
        const r = text.innerHTML.split("<br>");
        resultchinese.push(r[0]);
        resultenglish.push(r[1]);
      });
      return {
        chinese: resultchinese,
        english: resultenglish,
      };
    });

    const writeFile = util.promisify(fs.writeFile);
    const contentCn = `const chapter${task.chapter} = ${JSON.stringify(
      chinese,
      null,
      2
    )};\nexport default chapter${task.chapter};`;
    const contentEn = `const chapter${task.chapter} = ${JSON.stringify(
      english,
      null,
      2
    )};\nexport default chapter${task.chapter};`;
    await writeFile(task.pathCn, contentCn);
    await writeFile(task.pathEn, contentEn);
    await this.defferTime();
  }

  async defferTime() {
    const time = Math.random() * 3000;
    await new Promise((re) => {
      setTimeout(() => {
        re(true);
      }, time);
    });
    return time;
  }

  async download(task: Task) {
    // if (this.resolveList.includes(task.path)) {
    //   console.log("path aleardy resolved", task.path);
    //   return true;
    // }
    await this.downloadResource(task, 1);
  }

  async onError(error: any, queue: Task) {
    // console.log("bibledowoload error", queue.path, queue.url);
  }

  async onSuccess(result: any, queue: Task) {
    // console.log("bibledowoload success", queue.path, queue.url);
  }

  async generateTask() {
    for (let i = 0; i < contentsCn.length; i++) {
      const content = contentsCn[i];
      const length = +content.length;
      const nameEn = content.nameEn;
      const nameCn = content.nameCn;
      const dirEn = path.resolve(__dirname, `../bible/english/${nameEn}`);
      const dirCn = path.resolve(__dirname, `../bible/chinese/${nameCn}`);
      if (!fs.existsSync(dirEn)) {
        fs.mkdirSync(dirEn);
      }
      if (!fs.existsSync(dirCn)) {
        fs.mkdirSync(dirCn);
      }
      const stat = util.promisify(fs.stat);

      for (let j = 0; j < length; j++) {
        const pathEn = `${dirEn}/${j + 1}.ts`;
        const pathCn = `${dirCn}/${j + 1}.ts`;
        try {
          const fstatEn = await stat(pathEn);
          const fstatCn = await stat(pathCn);
          if (fstatEn.size !== 0 && fstatCn.size !== 0) {
            return;
          }
        } catch (error) {}

        console.log("next");

        const url = `http://sj.jidujiao.com/${nameEn}_${i + 1}_${j + 1}.html`;
        this.pushTask({
          url,
          nameEn: nameEn,
          nameCn: nameCn,
          pathEn: `${dirEn}/${j + 1}.ts`,
          pathCn: `${dirCn}/${j + 1}.ts`,
          chapter: j + 1,
        });
      }
    }
  }
}

const bibleSpider = new BibleSpider(5);
bibleSpider.generateTask();

setTimeout(() => {
  bibleSpider.start();
}, 3000);
// downloadbible.registerExecFn(downloadbible.checkeStat);
