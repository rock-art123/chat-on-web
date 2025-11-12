const fs = require("fs");
const path = require("path");
const { getUserPoints, reduceUserPoints, addUserPoints, getUserInfo } = require("./pointsService");

// 神秘老人商店数据存储文件路径
const MYSTERY_SHOP_DATA_FILE = path.join(__dirname, "..", "data", "mysteryShop.json");

// 确保数据目录存在
function ensureDataDirectory() {
  const dataDir = path.dirname(MYSTERY_SHOP_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// 初始化神秘商店数据文件
function initializeMysteryShopData() {
  ensureDataDirectory();
  if (!fs.existsSync(MYSTERY_SHOP_DATA_FILE)) {
    fs.writeFileSync(MYSTERY_SHOP_DATA_FILE, JSON.stringify({}), "utf8");
  }
}

// 读取神秘商店数据
function readMysteryShopData() {
  initializeMysteryShopData();
  try {
    const data = fs.readFileSync(MYSTERY_SHOP_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("读取神秘商店数据失败:", error);
    return {};
  }
}

// 写入神秘商店数据
function writeMysteryShopData(data) {
  initializeMysteryShopData();
  try {
    fs.writeFileSync(MYSTERY_SHOP_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("写入神秘商店数据失败:", error);
    return false;
  }
}

// 获取用户神秘商店数据
function getUserMysteryData(coreId) {
  if (!coreId) return null;
  
  const data = readMysteryShopData();
  return data[coreId] || null;
}

// 更新用户神秘商店数据
function updateUserMysteryData(coreId, mysteryData) {
  if (!coreId) return false;
  
  const data = readMysteryShopData();
  data[coreId] = {
    ...data[coreId],
    ...mysteryData,
    coreId: coreId,
    updatedAt: new Date().toISOString()
  };
  
  return writeMysteryShopData(data);
}

// 神秘礼物类型定义
const MYSTERY_REWARDS = [
  {
    id: "avatar_frame",
    name: "精美头像框",
    description: "获得精美头像框3天使用权",
    duration: 3, // 天数
    probability: 0.1569, // 占中奖概率的15.69%
    type: "avatar_frame"
  },
  {
    id: "svip",
    name: "SVIP特权",
    description: "获得SVIP特权3天使用权",
    duration: 3, // 天数
    probability: 0.1569, // 占中奖概率的15.69%
    type: "svip"
  },
  {
    id: "entrance_animation",
    name: "登录出场炫酷动画",
    description: "获得登录出场炫酷动画3天使用权",
    duration: 3, // 天数
    probability: 0.1569, // 占中奖概率的15.69%
    type: "entrance_animation"
  },
  {
    id: "points_200",
    name: "200积分",
    description: "获得200积分奖励",
    points: 200,
    probability: 0.2941, // 占中奖概率的29.41%
    type: "points_reward"
  },
  {
    id: "points_500",
    name: "500积分",
    description: "获得500积分奖励",
    points: 500,
    probability: 0.0980, // 占中奖概率的9.80%
    type: "points_reward"
  },
  {
    id: "points_1000",
    name: "1000积分",
    description: "获得1000积分奖励",
    points: 1000,
    probability: 0.0392, // 占中奖概率的3.92%
    type: "points_reward"
  },
  {
    id: "black_bomb",
    name: "黑色炸弹",
    description: "损失200积分，如果不足200，则扣到0积分",
    probability: 0.0980, // 占中奖概率的9.80%
    type: "punishment"
  }
];

// 计算总概率，用于验证
const TOTAL_PROBABILITY = MYSTERY_REWARDS.reduce((sum, reward) => sum + reward.probability, 0);
console.log(`神秘商店奖励概率总和: ${(TOTAL_PROBABILITY * 100).toFixed(2)}% (应该为100%)`);

// 处理奖励的函数
function processReward(coreId, reward) {
  console.log(`[MYSTERY_SHOP] 开始处理奖励:`, { coreId, rewardType: reward.name, rewardId: reward.id });
  
  try {
    // 处理黑色炸弹
    if (reward.type === "punishment") {
      console.log(`[MYSTERY_SHOP] 处理黑色炸弹奖励:`, { coreId });
      // 扣除额外200积分（黑色炸弹）
      const currentPoints = getUserPoints(coreId);
      const pointsToDeduct = Math.min(200, currentPoints);
      const bombPointsDeducted = reduceUserPoints(coreId, pointsToDeduct);
      
      if (bombPointsDeducted) {
        console.log(`[MYSTERY_SHOP] 黑色炸弹处理成功:`, { coreId, pointsDeducted: pointsToDeduct });
        return {
          success: true,
          reward: {
            ...reward,
            pointsLost: pointsToDeduct
          },
          message: `很遗憾，您抽中了黑色炸弹，损失了${pointsToDeduct}积分`
        };
      } else {
        console.error(`[MYSTERY_SHOP] 黑色炸弹处理失败:`, { coreId, currentPoints, pointsToDeduct });
        // 如果扣除失败，退还之前扣除的100积分
        addUserPoints(coreId, 100);
        return {
          success: false,
          message: "积分处理失败，已退还抽取费用"
        };
      }
    }
    
    // 处理SVIP特权
    if (reward.type === "svip") {
      console.log(`[MYSTERY_SHOP] 处理SVIP特权奖励:`, { coreId, duration: reward.duration });
      // 获取用户当前神秘商店数据
      const userMysteryData = getUserMysteryData(coreId) || {};
      const currentSvip = userMysteryData.svip || {};
      
      // 计算新的过期时间
      const now = new Date();
      let newExpiryDate = new Date();
      newExpiryDate.setDate(now.getDate() + reward.duration);
      
      // 如果已有SVIP且未过期，则累加天数
      if (currentSvip.expiryDate && new Date(currentSvip.expiryDate) > now) {
        const currentExpiry = new Date(currentSvip.expiryDate);
        newExpiryDate = new Date(currentExpiry.getTime() + reward.duration * 24 * 60 * 60 * 1000);
      }
      
      // 更新用户SVIP数据
      const updateResult = updateUserMysteryData(coreId, {
        svip: {
          hasSvip: true,
          expiryDate: newExpiryDate.toISOString(),
          type: "mystery_shop"
        }
      });
      
      if (!updateResult) {
        console.error(`[MYSTERY_SHOP] SVIP数据更新失败:`, { coreId });
        addUserPoints(coreId, 100);
        return {
          success: false,
          message: "SVIP数据处理失败，已退还抽取费用"
        };
      }
      
      console.log(`[MYSTERY_SHOP] SVIP特权处理成功:`, { coreId, expiryDate: newExpiryDate.toISOString() });
      return {
        success: true,
        reward: {
          ...reward,
          expiryDate: newExpiryDate.toISOString()
        },
        message: `恭喜！您抽中了SVIP特权，有效期至${newExpiryDate.toLocaleDateString()}`
      };
    }
    
    // 处理头像框
    if (reward.type === "avatar_frame") {
      console.log(`[MYSTERY_SHOP] 处理头像框奖励:`, { coreId, duration: reward.duration });
      // 获取用户当前神秘商店数据
      const userMysteryData = getUserMysteryData(coreId) || {};
      const currentAvatarFrame = userMysteryData.avatarFrame || {};
      
      // 计算新的过期时间
      const now = new Date();
      let newExpiryDate = new Date();
      newExpiryDate.setDate(now.getDate() + reward.duration);
      
      // 如果已有头像框且未过期，则累加天数
      if (currentAvatarFrame.expiryDate && new Date(currentAvatarFrame.expiryDate) > now) {
        const currentExpiry = new Date(currentAvatarFrame.expiryDate);
        newExpiryDate = new Date(currentExpiry.getTime() + reward.duration * 24 * 60 * 60 * 1000);
      }
      
      // 更新用户头像框数据
      const updateResult = updateUserMysteryData(coreId, {
        avatarFrame: {
          hasAvatarFrame: true,
          expiryDate: newExpiryDate.toISOString(),
          type: "mystery_shop"
        }
      });
      
      if (!updateResult) {
        console.error(`[MYSTERY_SHOP] 头像框数据更新失败:`, { coreId });
        addUserPoints(coreId, 100);
        return {
          success: false,
          message: "头像框数据处理失败，已退还抽取费用"
        };
      }
      
      console.log(`[MYSTERY_SHOP] 头像框处理成功:`, { coreId, expiryDate: newExpiryDate.toISOString() });
      return {
        success: true,
        reward: {
          ...reward,
          expiryDate: newExpiryDate.toISOString()
        },
        message: `恭喜！您抽中了精美头像框，有效期至${newExpiryDate.toLocaleDateString()}`
      };
    }
    
    // 处理出场动画
    if (reward.type === "entrance_animation") {
      console.log(`[MYSTERY_SHOP] 处理出场动画奖励:`, { coreId, duration: reward.duration });
      // 获取用户当前神秘商店数据
      const userMysteryData = getUserMysteryData(coreId) || {};
      const currentEntranceAnimation = userMysteryData.entranceAnimation || {};
      
      // 计算新的过期时间
      const now = new Date();
      let newExpiryDate = new Date();
      newExpiryDate.setDate(now.getDate() + reward.duration);
      
      // 如果已有出场动画且未过期，则累加天数
      if (currentEntranceAnimation.expiryDate && new Date(currentEntranceAnimation.expiryDate) > now) {
        const currentExpiry = new Date(currentEntranceAnimation.expiryDate);
        newExpiryDate = new Date(currentExpiry.getTime() + reward.duration * 24 * 60 * 60 * 1000);
      }
      
      // 更新用户出场动画数据
      const updateResult = updateUserMysteryData(coreId, {
        entranceAnimation: {
          hasEntranceAnimation: true,
          expiryDate: newExpiryDate.toISOString(),
          type: "mystery_shop"
        }
      });
      
      if (!updateResult) {
        console.error(`[MYSTERY_SHOP] 出场动画数据更新失败:`, { coreId });
        addUserPoints(coreId, 100);
        return {
          success: false,
          message: "出场动画数据处理失败，已退还抽取费用"
        };
      }
      
      console.log(`[MYSTERY_SHOP] 出场动画处理成功:`, { coreId, expiryDate: newExpiryDate.toISOString() });
      return {
        success: true,
        reward: {
          ...reward,
          expiryDate: newExpiryDate.toISOString()
        },
        message: `恭喜！您抽中了登录出场炫酷动画，有效期至${newExpiryDate.toLocaleDateString()}`
      };
    }
    
    // 处理积分奖励
    if (reward.type === "points_reward") {
      console.log(`[MYSTERY_SHOP] 处理积分奖励:`, { coreId, points: reward.points });
      // 增加用户积分
      const pointsAdded = addUserPoints(coreId, reward.points);
      
      if (pointsAdded) {
        console.log(`[MYSTERY_SHOP] 积分奖励处理成功:`, { coreId, pointsAwarded: reward.points });
        return {
          success: true,
          reward: {
            ...reward,
            pointsAwarded: reward.points
          },
          message: `恭喜！您抽中了${reward.points}积分奖励`
        };
      } else {
        console.error(`[MYSTERY_SHOP] 积分奖励处理失败:`, { coreId, points: reward.points });
        // 如果积分添加失败，退还之前扣除的100积分
        addUserPoints(coreId, 100);
        return {
          success: false,
          message: "积分处理失败，已退还抽取费用"
        };
      }
    }
    
    // 未知奖励类型
    console.error(`[MYSTERY_SHOP] 未知奖励类型:`, { coreId, rewardType: reward.type });
    return {
      success: false,
      message: "未知的奖励类型"
    };
  } catch (error) {
    console.error(`[MYSTERY_SHOP] 处理奖励时发生错误:`, { coreId, rewardType: reward.name, error: error.message, stack: error.stack });
    // 如果发生错误，退还之前扣除的100积分
    addUserPoints(coreId, 100);
    return {
      success: false,
      message: `处理奖励时发生错误: ${error.message}`
    };
  }
}

// 抽取神秘礼物
function drawMysteryReward(coreId) {
  console.log(`[MYSTERY_SHOP] 开始抽取神秘礼物:`, { coreId });
  
  // 参数验证
  if (!coreId) {
    return {
      success: false,
      message: "用户ID不能为空"
    };
  }
  
  // 检查用户积分是否足够
  const userPoints = getUserPoints(coreId);
  if (userPoints < 100) {
    console.log(`[MYSTERY_SHOP] 用户积分不足:`, { coreId, userPoints });
    return {
      success: false,
      message: "积分不足，需要100积分才能抽取神秘礼物"
    };
  }
  
  // 扣除100积分
  const pointsDeducted = reduceUserPoints(coreId, 100);
  if (!pointsDeducted) {
    console.error(`[MYSTERY_SHOP] 积分扣除失败:`, { coreId, userPoints });
    return {
      success: false,
      message: "积分扣除失败"
    };
  }
  
  console.log(`[MYSTERY_SHOP] 积分扣除成功:`, { coreId, deductedPoints: 100, remainingPoints: getUserPoints(coreId) });
  
  // 生成0-100的随机数
  const random = Math.random() * 100; // 生成0-100之间的随机数
  
  console.log(`[MYSTERY_SHOP] 抽奖随机数:`, { coreId, random });
  
  // 首先判断是否中奖（50%概率）
  if (random >= 35) {
    // 未中奖
    console.log(`[MYSTERY_SHOP] 用户未中奖:`, { coreId, random });
    return {
      success: true,
      reward: null,
      message: "很遗憾，您没有抽中任何礼物"
    };
  }
  
  // 中奖了，根据概率分配奖品
  let cumulativeProbability = 0;
  
  // 计算累积概率并判断中奖
  for (const rewardType of MYSTERY_REWARDS) {
    cumulativeProbability += rewardType.probability;
    // 将累积概率转换为0-50范围内的值
    const adjustedCumulativeProbability = cumulativeProbability * 50;
    
    console.log(`[MYSTERY_SHOP] 检查奖励:`, { 
      coreId, 
      rewardType: rewardType.name, 
      probability: rewardType.probability, 
      cumulativeProbability,
      adjustedCumulativeProbability,
      random,
      result: random < adjustedCumulativeProbability ? '中奖' : '未中'
    });
    
    if (random < adjustedCumulativeProbability) {
      // 中奖了，处理奖励
      console.log(`[MYSTERY_SHOP] 用户中奖:`, { coreId, rewardType: rewardType.name });
      return processReward(coreId, rewardType);
    }
  }
  
  // 如果没有匹配到任何奖励（理论上不应该发生），返回未中奖
  console.log(`[MYSTERY_SHOP] 未匹配到任何奖励，返回未中奖:`, { coreId, random });
  return {
    success: true,
    reward: null,
    message: "很遗憾，您没有抽中任何礼物"
  };
}

// 检查用户是否有SVIP特权
function hasSvip(coreId) {
  if (!coreId) return false;
  
  const userMysteryData = getUserMysteryData(coreId);
  if (!userMysteryData || !userMysteryData.svip) {
    return false;
  }
  
  const now = new Date();
  const expiryDate = new Date(userMysteryData.svip.expiryDate);
  
  // 检查是否过期
  if (expiryDate <= now) {
    // 如果已过期，清除数据
    updateUserMysteryData(coreId, {
      svip: {
        hasSvip: false,
        expiryDate: null,
        type: null
      }
    });
    return false;
  }
  
  return true;
}

// 检查用户是否有头像框
function hasAvatarFrame(coreId) {
  if (!coreId) return false;
  
  const userMysteryData = getUserMysteryData(coreId);
  if (!userMysteryData || !userMysteryData.avatarFrame) {
    return false;
  }
  
  const now = new Date();
  const expiryDate = new Date(userMysteryData.avatarFrame.expiryDate);
  
  // 检查是否过期
  if (expiryDate <= now) {
    // 如果已过期，清除数据
    updateUserMysteryData(coreId, {
      avatarFrame: {
        hasAvatarFrame: false,
        expiryDate: null,
        type: null
      }
    });
    return false;
  }
  
  return true;
}

// 检查用户是否有出场动画
function hasEntranceAnimation(coreId) {
  if (!coreId) return false;
  
  const userMysteryData = getUserMysteryData(coreId);
  if (!userMysteryData || !userMysteryData.entranceAnimation) {
    return false;
  }
  
  const now = new Date();
  const expiryDate = new Date(userMysteryData.entranceAnimation.expiryDate);
  
  // 检查是否过期
  if (expiryDate <= now) {
    // 如果已过期，清除数据
    updateUserMysteryData(coreId, {
      entranceAnimation: {
        hasEntranceAnimation: false,
        expiryDate: null,
        type: null
      }
    });
    return false;
  }
  
  return true;
}

// 获取用户神秘商店信息
function getUserMysteryShopInfo(coreId) {
  if (!coreId) return null;
  
  const userPoints = getUserPoints(coreId);
  const hasAvatar = hasAvatarFrame(coreId);
  const hasAnimation = hasEntranceAnimation(coreId);
  const hasSvipStatus = hasSvip(coreId);
  const userMysteryData = getUserMysteryData(coreId) || {};
  
  return {
    coreId: coreId,
    points: userPoints,
    canDraw: userPoints >= 100,
    avatarFrame: userMysteryData.avatarFrame || null,
    entranceAnimation: userMysteryData.entranceAnimation || null,
    svip: userMysteryData.svip || null,
    hasAvatarFrame: hasAvatar,
    hasEntranceAnimation: hasAnimation,
    hasSvip: hasSvipStatus
  };
}

// 导出所有功能
module.exports = {
  drawMysteryReward,
  hasAvatarFrame,
  hasEntranceAnimation,
  hasSvip,
  getUserMysteryShopInfo,
  getUserMysteryData,
  updateUserMysteryData,
  MYSTERY_REWARDS
};