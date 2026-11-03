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

const calculator = new WishCalculator();
const rates = calculator.calcAchievementRates(1);

for (const [i, rate] of Object.entries(rates)) {
  const rateStr = (rate * 100).toFixed(4);
  console.log(`${i}連 ${rateStr}%`);
}

// TODO alpineでinputを作って目標数を入力可能にする
// TODO graphで達成率を見られるようにする
