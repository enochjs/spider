import path from "path";
import fs from "fs";
import axios from "axios";
const util = require("util");
import { Concurrency } from "./concurrency";
import { contentsCn } from "./constants";

interface Task {
  url: string;
  path: string;
}

class Mp3Download extends Concurrency<Task> {
  private resolveList: string;
  constructor(max: number) {
    super(max);
    const dir = path.resolve(__dirname, `../mp3/result.txt`);
    this.resolveList = fs.readFileSync(dir).toString();
  }

  async resolveFile(taskPath: string) {
    const dir = path.resolve(__dirname, `../mp3/result.txt`);
    const appendFile = util.promisify(fs.appendFile);
    await appendFile(dir, `${taskPath} \n`);
    console.log("写入成功", taskPath);
  }

  async downloadResource(task: Task, count: number) {
    if (count > 5) {
      return;
    }
    const writeStream = fs.createWriteStream(task.path);
    const result = await new Promise((resolve) => {
      axios({
        method: "get",
        url: task.url,
        responseType: "stream",
      })
        .then((response) => {
          response.data.pipe(writeStream);
          response.data.on("data", async () => {
            console.log(task.path, "downing ===>");
          });
          response.data.on("end", async () => {
            await this.resolveFile(task.path);
            resolve(true);
          });
        })
        .catch((error) => {
          setTimeout(() => {
            console.log("error 3 secend later retry:", error);
            this.downloadResource(task, count + 1);
          }, 3000);
        });
    });
    await this.defferTime();
    return result;
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

  async checkeStat(task: Task) {
    const stat = util.promisify(fs.stat);
    const dir = path.resolve(__dirname, `../mp3/error.txt`);
    const appendFile = util.promisify(fs.appendFile);
    if (this.resolveList.includes(task.path)) {
      console.log("path aleardy resolved", task.path);
      return true;
    }
    try {
      const fstat = await stat(task.path);
      if (fstat.size) {
        const result = await axios.head(task.url, {
          timeout: 5000,
        });
        console.log(
          "header size",
          result.headers["content-length"],
          fstat.size,
          +fstat.size !== +result.headers["content-length"]
        );
        if (+fstat.size !== +result.headers["content-length"]) {
          await appendFile(dir, `${task.path} \n`);
        } else {
          await this.resolveFile(task.path);
        }
        return;
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  async download(task: Task) {
    if (this.resolveList.includes(task.path)) {
      console.log("path aleardy resolved", task.path);
      return true;
    }
    const stat = util.promisify(fs.stat);
    try {
      const fstat = await stat(task.path);
      if (fstat.size) {
        const result = await axios.head(task.url, {
          timeout: 5000,
        });
        console.log(
          "header size",
          result.headers["content-length"],
          fstat.size,
          +fstat.size !== +result.headers["content-length"]
        );
        if (+fstat.size !== +result.headers["content-length"]) {
          await this.downloadResource(task, 1);
        } else {
          await this.resolveFile(task.path);
        }
        return;
      } else {
        await this.downloadResource(task, 1);
      }
    } catch (error) {
      console.log("error", error);
      await this.downloadResource(task, 1);
    }
  }

  async onError(error: any, queue: Task) {
    // console.log("mp3dowoload error", queue.path, queue.url);
  }

  async onSuccess(result: any, queue: Task) {
    // console.log("mp3dowoload success", queue.path, queue.url);
  }

  async generateTask() {
    for (let i = 0; i < contentsCn.length; i++) {
      const content = contentsCn[i];
      const length = +content.length;
      const nameCn = content.nameCn;
      const nameEn = content.nameEn;
      const dirEn = path.resolve(__dirname, `../mp3/english/${nameEn}`);
      const dirCn = path.resolve(__dirname, `../mp3/chinese/${nameCn}`);
      if (!fs.existsSync(dirEn)) {
        fs.mkdirSync(dirEn);
      }
      if (!fs.existsSync(dirCn)) {
        fs.mkdirSync(dirCn);
      }
      for (let j = 0; j < length; j++) {
        // const element = array[j];
        const urlEn = `http://jiaoxue.jidujiao.com/mp3en/${encodeURIComponent(
          nameCn
        )}/${encodeURIComponent(`${nameCn}第${j + 1}章`)}.mp3`;
        const urlCn = `http://jiaoxue.jidujiao.com/mp3/${encodeURIComponent(
          nameCn
        )}/${encodeURIComponent(`${nameCn}第${j + 1}章`)}.mp3`;
        const pathCn = dirCn + `/${j + 1}.mp3`;
        const pathEn = dirEn + `/${j + 1}.mp3`;

        this.pushTask({
          url: urlCn,
          path: pathCn,
        });
        this.pushTask({
          url: urlEn,
          path: pathEn,
        });
      }
    }
  }
}

const downloadMp3 = new Mp3Download(3);
downloadMp3.generateTask();
// downloadMp3.registerExecFn(downloadMp3.checkeStat);
downloadMp3.start();
