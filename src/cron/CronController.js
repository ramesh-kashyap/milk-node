const cron = require('node-cron');
const { Op } = require('sequelize');
const User = require("../models/User");
const logger = require("../../utils/logger");
const { getVip } = require('../services/userService');
const { Income, Transaction,Reward,Growth } = require("../models");



const countActiveTeamIds = async (userId) => {
  let arrin = [userId];
  let totalActiveIds = new Set();

  while (arrin.length > 0) {
    const allDown = await User.findAll({
      where: { sponsor: arrin },
      attributes: ['id'],
    });

    const activeDown = await User.findAll({
      where: {
        sponsor: arrin,
        active_status: 'Active'
      },
      attributes: ['id'],
    });

    if (allDown.length > 0) {
      const newLevelIds = allDown.map(u => u.id);
      const newActiveIds = activeDown.map(u => u.id);
      newActiveIds.forEach(id => totalActiveIds.add(id));
      arrin = newLevelIds;
    } else {
      arrin = [];
    }
  }

  return totalActiveIds.size;
};


const GROWTH_REWARDS = [
  { members: 20, amount: 50 },
  { members: 60, amount: 60 },
  { members: 120, amount: 150 },
  { members: 300, amount: 200 },
  { members: 600, amount: 400 },
  { members: 1200, amount: 600 },
  { members: 3000, amount: 1500 },
  { members: 6000, amount: 3000 },
  { members: 10000, amount: 5000 },
  { members: 30000, amount: 10000 },
  { members: 60000, amount: 20000 },
  { members: 100000, amount: 30000 },
  { members: 300000, amount: 50000 },
  { members: 600000, amount: 100000 },
  { members: 1000000, amount: 200000 },
];

const globalCommunity = async () => {
  const allUsers = await User.findAll();

  for (const user of allUsers) {

    const directList = await User.findAll({
      where: { sponsor: user.id },
      attributes: ['id', 'username']
    });

    const activityMap = {};
    for (const direct of directList) {
      const activeCount = await countActiveTeamIds(direct.id);
      const isActive = await User.findOne({
        where: {
          id: direct.id,
          active_status: 'Active'
        }
      });

      const totalCount = activeCount + (isActive ? 1 : 0);
      activityMap[direct.username] = totalCount;
    }

    const power_leg = Math.max(...Object.values(activityMap), 0);
    const total = Object.values(activityMap).reduce((a, b) => a + b, 0);
    const vicker_leg = total - power_leg;

    await User.update(
      { power_leg: power_leg, vicker_leg: vicker_leg },
      { where: { id: user.id } }
    );

    // Check 50-50 growth rewards
    for (const reward of GROWTH_REWARDS) {
      const half = reward.members / 2;

      if (power_leg >= half && vicker_leg >= half) {
        const exists = await Growth.findOne({
          where: {
            user_id: user.id,
            level: reward.members
          }
        });

        if (!exists) {
          await Growth.create({
            user_id: user.id,
            user_id_fk: user.username,
            total_business: reward.members,
            amount: reward.amount,
            level: reward.members,
            status: 0,
            remarks: 'Growth Bonus',
            Inactive_status: 0,
            tdate: new Date()
          });
        }
      }
    }
  }

  logger.info('Finished global community update with 50/50 growth rewards.');
};


const salaryMap = {
  2: { direct: 10, team: 150, salary: 500 },
  3: { direct: 20, team: 400, salary: 750 },
  5: { direct: 40, team: 1500, salary: 1000 },
  6: { direct: 100, team: 5000, salary: 2000 },
};


const myLevelTeam = async (userId, level = 5) => {
    let arrin = [userId];
    let ret = {};
    let i = 1;
    
    while (arrin.length > 0) {
        const allDown = await User.findAll({
            attributes: ['id'],
            where: { sponsor: { [Op.in]: arrin } }
        });

        if (allDown.length > 0) {
            arrin = allDown.map(user => user.id);
            ret[i] = arrin;
            i++;
            // if (i > level) break;
        } else {
            arrin = [];
        }
    }
    return Object.values(ret).flat();
};

const MonthlySalaries = async () => {
  // const allUsers = await User.findAll();
  const allUsers = await User.findAll({
  where: {
    username: 'HYM704379'
  }
});
  // logger.info(`Starting Monthly Salary Distribution for ${allUsers.length} users.`);

  for (const user of allUsers) {

    const vip = await getVip(user.id);
    if (!vip || !salaryMap[vip]) {
      continue;
    }

    const directCount = await User.count({
      where: { sponsor: user.id, active_status: 'Active' }
    });

    const teamIds = await myLevelTeam(user.id);

    // console.log(teamIds);
    
    if (!teamIds.length) {
      // logger.warn(`Skipped user ${user.username}: No downline found.`);
      continue;
    }

    const teamMembers = await User.findAll({
      where: { id: { [Op.in]: teamIds } },
      attributes: ['id', 'active_status']
    });

    const totalActiveIds = teamMembers.filter(u => u.active_status === 'Active').length;

    console.log(totalActiveIds);
    

    // Loop from current VIP rank down to find eligible level
    const sortedRanks = Object.keys(salaryMap).map(Number).sort((a, b) => b - a); // descending
    let finalVip = null;
    for (const rank of sortedRanks) {
      if (vip >= rank) {
        const requirement = salaryMap[rank];
        if (directCount >= requirement.direct && totalActiveIds >= requirement.team) {
          finalVip = rank;
          break;
        }
      }
    }

    if (!finalVip) {
      continue;
    }

    // Check if already rewarded this month
    const now = new Date();

    const alreadyGiven = await Reward.findOne({
      where: {
        user_id: user.id,
        remarks: "Monthly Salary",
        level: finalVip,
      },
    });

    if (alreadyGiven) {
      continue;
    }
    const finalSalary = salaryMap[finalVip].salary;

   await Reward.create({
        user_id: user.id,
        user_id_fk: user.username,
        total_business: totalActiveIds,
        amount: finalSalary,
        tdate: new Date(),
        level: finalVip,
        status: 1,
        remarks: 'Monthly Salary',
        Inactive_status: 0,
        created_at: new Date(),
        updated_at: new Date()
      });

  

  }

  // logger.info('✅ Finished Monthly Salary Distribution.');
};


const processPendingRewards = async () => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const pendingRewards = await Reward.findAll({
    where: {
      tdate: {
        [Op.lte]: oneMonthAgo
      },
      status: "Approved",             // Eligible
      Inactive_status: 0     // Still active
    }
  });

    // logger.info(`Starting pendingRewards Salary Distribution for ${pendingRewards.length} users.`);

  for (const reward of pendingRewards) {
    const user = await User.findByPk(reward.user_id);
    const teamIds = await myLevelTeam(user.id);

    const teamMembers = await User.findAll({
      where: { id: { [Op.in]: teamIds } },
      attributes: ['id', 'active_status']
    });

    const activeTeamCount = teamMembers.filter(u => u.active_status === 'Active').length;
    const directCount = await User.count({
      where: { sponsor: user.id, active_status: 'Active' }
    });

    // Determine the highest VIP rank the user now qualifies for
    const sortedRanks = Object.keys(salaryMap).map(Number).sort((a, b) => b - a);
    let currentAchievableRank = null;

    for (const rank of sortedRanks) {
      const requirement = salaryMap[rank];
      if (directCount >= requirement.direct && activeTeamCount >= requirement.team) {
        currentAchievableRank = rank;
        break;
      }
    }

    // If user still qualifies for the same reward or better
    if (currentAchievableRank && currentAchievableRank >= reward.level) {
      const rewardAmount = salaryMap[currentAchievableRank].salary;
      const lastIncome = await Income.findOne({
          where: {
            user_id: user.id,
            remarks: "Monthly Salary"
          },
          order: [['ttime', 'DESC']]
        });

        if (lastIncome) {
          const nextEligibleDate = new Date(lastIncome.ttime);
          nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 1);

          if (new Date() < nextEligibleDate) {
            // logger.warn(`Skipping user ${user.username}: next salary due after ${nextEligibleDate.toISOString().split('T')[0]}`);
            continue;
          }
        }

        await Income.create({
          user_id: user.id,
          user_id_fk: user.username,
          amt: rewardAmount,
          comm: rewardAmount,
          remarks: "Monthly Salary",
          ttime: new Date(),
          created_at: new Date()
        });

        await Transaction.create({
          user_id: user.id,
          user_id_fk: user.username,
          amount: rewardAmount,
          credit_type: 1,
          remarks: "Monthly Salary",
          ttime: new Date(),
          created_at: new Date()
        });

        await User.update(
          {
            userbalance: parseFloat(user.userbalance) + parseFloat(rewardAmount),
          },
          { where: { id: user.id } }
        );

        // logger.info(`✅ Released monthly salary $${rewardAmount} for user ${user.username} after 1 month of reward achievement.`);
     
    } else {
      // logger.warn(`❌ User ${user.username} no longer qualifies for reward (was: level ${reward.level}, now: ${currentAchievableRank || 'none'})`);
    }
  }

  // logger.info("✅ Finished processing pending rewards after 1 month.");
};


cron.schedule('*/1 * * * *', async () => {
//   logger.info("⏳ Running scheduled global community cron...");
  try {
    await globalCommunity();
  } catch (err) {
    // logger.error(`❌ Cron error: ${err.message}`, err);
  }
});

cron.schedule('*/1 * * * *', async () => {
  // logger.info("⏳ Running scheduled global community cron...");
  try {
    await processPendingRewards();
  } catch (err) {
    // logger.error(`❌ Cron error: ${err.message}`, err);
  }
});

module.exports = { MonthlySalaries};
