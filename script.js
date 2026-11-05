class WishCalculator {
  MAX_PITY = 90;

  index(item, lost, pity) {
    return item * 2 * (this.MAX_PITY + 1) + lost * (this.MAX_PITY + 1) + pity;
  }

  updateDP(dp, next, goal) {
    next.fill(0);

    const pitySize = this.MAX_PITY + 1;
    const itemSize = 2 * pitySize;

    let achieved = 0;

    for (let item = 0; item < goal; item++) {
      const itemBase = item * itemSize;
      const nextItemBase = itemBase + itemSize;

      for (let lost = 0; lost < 2; lost++) {
        const base = itemBase + lost * pitySize;

        for (let pity = 0; pity < this.MAX_PITY; pity++) {
          const prob = dp[base + pity];

          if (prob === 0) {
            continue;
          }

          const count = pity + 1;
          const odds = count < 73 ? 6 : 6 + (count - 73) * 60;
          const p = Math.min(odds / 1000, 1);

          if (p < 1) {
            next[base + count] += prob * (1 - p);
          }

          const targetProb = lost ? p : p * 0.5;

          if (item + 1 === goal) {
            achieved += prob * targetProb;
          } else {
            next[nextItemBase] += prob * targetProb;
          }

          if (!lost) {
            next[itemBase + pitySize] += prob * p * 0.5;
          }
        }
      }
    }

    return { next, achieved };
  }

  calcAchievementRates(goal) {
    const maxPulls = goal * 180;

    const size = (goal + 1) * 2 * (this.MAX_PITY + 1);
    let dp = new Float64Array(size);
    let next = new Float64Array(size);

    dp[this.index(0, 0, 0)] = 1;

    let achieved = 0;
    const rates = [0];

    for (let pull = 1; pull <= maxPulls; pull++) {
      const result = this.updateDP(dp, next, goal);

      [dp, next] = [next, dp];

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
  Alpine.data("calculator", () => ({
    INPUTS_LOCALSTORAGE_KEY: "wish_scope:inputs",
    PRIMO_PAR_MONTH: 9500,
    GOAL_MIN: 0,
    GOAL_MAX: 12,

    wishCalculator: null,
    versionManager: null,
    achievementRates: [],

    inputs: {
      goal: 0,
      primo: 0,
      fate: 0,
      starlight: 0,
      count: 0,
    },

    init() {
      const inputs = localStorage.getItem(this.INPUTS_LOCALSTORAGE_KEY);

      if (inputs) {
        this.inputs = JSON.parse(inputs);
      }

      this.wishCalculator = new WishCalculator();
      this.versionManager = new VersionManager();
      this.versionList = this.versionManager.generateVersionList(new Date(), 20);

      this.achievementRates = this.wishCalculator.calcAchievementRates(this.inputs.goal);

      this.$watch(
        () => this.inputs.goal,
        () => {
          this.inputs.goal = Math.max(Math.min(this.inputs.goal, this.GOAL_MAX), this.GOAL_MIN);
          this.achievementRates = this.wishCalculator.calcAchievementRates(this.inputs.goal);
        },
      );

      this.$watch(
        () => this.inputs,
        () => {
          localStorage.setItem(this.INPUTS_LOCALSTORAGE_KEY, JSON.stringify(this.inputs));
        },
      );
    },

    get totalPrimo() {
      return this.inputs.primo + (this.inputs.fate + this.inputs.count + Math.floor(this.inputs.starlight / 5)) * 160;
    },

    formatDate(date) {
      const d = new Date(date);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    },

    estimatePrimo(days) {
      const primo = (this.totalPrimo + ((this.PRIMO_PAR_MONTH * 12) / 365.2422) * days) * (16 / 15);
      return Math.floor(primo);
    },

    estimateCount(days) {
      return Math.floor(this.estimatePrimo(days) / 160);
    },

    achieved(days) {
      if (this.inputs.goal === 0) {
        return "-";
      }

      const count = this.estimateCount(days);

      if (this.achievementRates.length < count) {
        return "100%";
      }

      const rate = this.achievementRates[count];
      const percentage = Math.round(rate * 100 * 10000) / 10000;

      return percentage >= 100 ? "100%" : `${percentage.toFixed(4)}%`;
    },
  }));
});
