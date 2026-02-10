import cron, { ScheduledTask } from "node-cron";
import { DcaRule } from "./store";

class DcaScheduler {
  private tasks = new Map<string, ScheduledTask>();

  schedule(rule: DcaRule, onTick: (rule: DcaRule) => void): void {
    if (this.tasks.has(rule.id)) {
      this.cancel(rule.id);
    }

    const task = cron.schedule(
      rule.cron,
      () => {
        onTick(rule);
      },
      {
        timezone: "UTC",
      }
    );

    this.tasks.set(rule.id, task);
  }

  cancel(id: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      return;
    }
    task.stop();
    this.tasks.delete(id);
  }
}

export const dcaScheduler = new DcaScheduler();
