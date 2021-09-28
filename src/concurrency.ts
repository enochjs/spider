class Concurrency<T> {
  // 并发数
  private max: number;
  // 任务数
  private taskList: T[];

  private registerFn: null | Function = null;

  constructor(max: number) {
    this.max = max;
    this.taskList = [];
  }

  start() {
    if (this.taskList.length === 0) {
      console.log("没有要执行的任务");
      return;
    }
    for (let i = 0; i < this.max; i++) {
      const task = this.taskList.pop();
      this.excuteTask(task);
    }
  }

  pushTask(task: T) {
    this.taskList.push(task);
  }

  async download(task: T): Promise<unknown> {
    return true;
  }

  registerExecFn(fn: (task: T) => Promise<unknown>) {
    this.registerFn = fn;
  }

  async onError(error: any, task: T) {}

  async onSuccess(result: any, task: T) {}

  async excuteTask(task?: T) {
    if (!task) {
      return;
    }
    const fn = this.registerFn ? this.registerFn : this.download;
    const result = await fn.call(this, task);
    console.log(`remain ${this.taskList.length} task to excute`);
    this.onSuccess(result, task);
    const nextTask = this.taskList.pop();
    this.excuteTask(nextTask);
  }
}

export { Concurrency };
