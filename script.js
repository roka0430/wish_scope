class WishCalculator {
  MAX_PITY = 90;

  updateDP(dp, goal) {
    const next = Array.from({ length: goal + 1 }, () =>
      Array.from({ length: 2 }, () => Array(this.MAX_PITY + 1).fill(0)),
    );

    let achieved = 0;

    for (let item = 0; item < goal; item++) {
      for (let lost = 0; lost < 2; lost++) {
        for (let pity = 0; pity < this.MAX_PITY; pity++) {
          const prob = dp[item][lost][pity];

          if (prob === 0) {
            continue;
          }

          const count = pity + 1;
          const odds = count < 73 ? 6 : 6 + (count - 73) * 60;

          const p = Math.min(odds / 1000, 1);

          if (p < 1) {
            next[item][lost][count] += prob * (1 - p);
          }

          const targetProb = lost ? p : p * 0.5;

          if (item + 1 === goal) {
            achieved += prob * targetProb;
          } else {
            next[item + 1][0][0] += prob * targetProb;
          }

          if (!lost) {
            next[item][1][0] += prob * p * 0.5;
          }
        }
      }
    }

    return { next, achieved };
  }

  calcAchievementRates(goal) {
    const maxPulls = goal * 180;

    let dp = Array.from({ length: goal + 1 }, () => Array.from({ length: 2 }, () => Array(this.MAX_PITY + 1).fill(0)));

    dp[0][0][0] = 1;

    let achieved = 0;
    const rates = [0];

    for (let pull = 1; pull <= maxPulls; pull++) {
      const result = this.updateDP(dp, goal, this.MAX_PITY);

      dp = result.next;
      achieved += result.achieved;

      rates.push(achieved);
    }

    return rates;
  }
}

class Version {
  constructor(major, minor, half, start) {
    this.major = major;
    this.minor = minor;
    this.half = half;
    this.start = new Date(start);
    this.start.setHours(0, 0, 0, 0);
  }

  get name() {
    return `${this.major}.${this.minor}${["前半", "後半"][this.half]}`;
  }

  get end() {
    const days = [20, 21][this.half];
    return this.addDays(this.start, days);
  }

  get next() {
    if (this.half === 0) {
      return new Version(this.major, this.minor, 1, this.end);
    }

    if (this.minor >= 8) {
      return new Version(this.major + 1, 0, 0, this.addDays(this.end, 1));
    }

    return new Version(this.major, this.minor + 1, 0, this.addDays(this.end, 1));
  }

  get remainingDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.ceil((this.end - today) / (1000 * 60 * 60 * 24));
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

class VersionManager {
  VERSION_BASIS = new Version(7, 0, 0, "2026-08-12");

  generateVersionList(startDate, versions) {
    const startDt = new Date(startDate);

    let version = this.VERSION_BASIS;
    while (this.compareDate(startDt, version.next.start) >= 0) {
      version = version.next;
    }

    const versionList = [version];
    for (let i = 0; i < versions - 1; i++) {
      versionList.push(versionList[i].next);
    }

    return versionList;
  }

  compareDate(date1, date2) {
    const a = new Date(date1).getTime();
    const b = new Date(date2).getTime();

    return Math.sign(a - b);
  }
}

document.addEventListener("alpine:init", () => {
  Alpine.data("input", () => ({
    calculator: null,
    goal: 0,

    init() {
      this.calculator = new WishCalculator();
    },

    get achievementRates() {
      return this.calculator ? this.calculator.calcAchievementRates(this.goal) : [];
    },
  }));

  Alpine.data("output", () => ({
    versionManager: null,

    init() {
      this.versionManager = new VersionManager();
      this.versionList = this.versionManager.generateVersionList(new Date(), 20);
    },

    formatDate(date) {
      const d = new Date(date);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    },
  }));
});
