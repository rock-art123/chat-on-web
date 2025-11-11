const { 
  onlineUsers, 
  userInfoMap, 
  chatHistory // 暴露 chatHistory 以便写入
} = require('../services/userService');
const { MAX_HISTORY } = require('../config/constants');
const { 
  getUserPoints, 
  addUserPoints, 
  reduceUserPoints,
  canClaimDailyPoints, 
  claimDailyPoints,
  addUserOnlineMinutes,
  resetUserOnlineMinutes,
  getUserInfo,
  cleanupInactiveUsers
} = require('../services/pointsService');
const {
  createRedPacket,
  receiveRedPacket,
  getRedPacketDetails,
  getUserRedPacketHistory,
  cleanupExpiredRedPackets
} = require('../services/redPacketService');

const starService = require('../services/starReplyService');
const {
  drawMysteryReward,
  hasAvatarFrame,
  hasEntranceAnimation,
  hasSvip,
  getUserMysteryShopInfo
} = require('../services/mysteryShopService');


module.exports = (io) => {
  // 确保只有一个定时器在运行 - 使用全局变量
  if (global.pointsInterval) {
    clearInterval(global.pointsInterval);
    console.log("清理旧的积分定时器");
  }
  
  // 每1小时为在线用户增加10积分
  global.pointsInterval = setInterval(() => {
    const now = new Date();
    console.log(`[${now.toLocaleTimeString()}] 开始为在线用户增加积分...`);
    
    // 遍历所有在线用户
    onlineUsers.forEach((userId, socketId) => {
      const userInfo = userInfoMap.get(userId);
      if (userInfo && userInfo.coreId) {
        // 为在线用户增加10积分
        const success = addUserPoints(userInfo.coreId, 10);
        if (success) {
          // 增加在线时长（60分钟）
          addUserOnlineMinutes(userInfo.coreId, 60);
          
          // 获取更新后的积分和用户信息
          const updatedPoints = getUserPoints(userInfo.coreId);
          const userData = getUserInfo(userInfo.coreId);
          
          // 向用户发送积分更新通知
          io.to(socketId).emit("points_updated", {
            coreId: userInfo.coreId,
            points: updatedPoints,
            addedPoints: 10,
            canClaimDaily: canClaimDailyPoints(userInfo.coreId), // 添加canClaimDaily状态
            lastClaimDate: userData?.lastDailyClaim || null // 添加最后领取日期
          });
          
          // 广播更新后的用户列表给所有用户，确保积分显示正确
          const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
            const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
            // 获取每个用户的最新积分信息
            const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
            const userHasAvatarFrame = userInfo.coreId ? hasAvatarFrame(userInfo.coreId) : false;
            const userHasEntranceAnimation = userInfo.coreId ? hasEntranceAnimation(userInfo.coreId) : false;
            const userHasSvip = userInfo.coreId ? hasSvip(userInfo.coreId) : false;
            
            return {
              ...userInfo,
              points: userPoints,
              hasAvatarFrame: userHasAvatarFrame,
              hasEntranceAnimation: userHasEntranceAnimation,
              hasSvip: userHasSvip
            };
          });
          
          // 广播更新后的用户列表
          io.emit("users_updated", updatedUsersList);
          
          console.log(`[${now.toLocaleTimeString()}] 用户 ${userInfo.username} 积分增加10，当前积分: ${updatedPoints}`);
        }
      }
    });
  }, 3600000); // 每1小时执行一次（3600000毫秒）
  
  console.log("积分定时器已设置，每1小时执行一次");
  
  // 设置清理不活跃用户的定时器 - 每天执行一次
  if (global.cleanupInterval) {
    clearInterval(global.cleanupInterval);
    console.log("清理旧的清理定时器");
  }
  
  // 每天凌晨2点执行清理不活跃用户
  const scheduleCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 设置为明天凌晨2点
    
    const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    console.log(`将在 ${tomorrow.toLocaleString()} 执行下一次不活跃用户清理`);
    
    global.cleanupTimeout = setTimeout(() => {
      console.log("开始执行不活跃用户清理...");
      const cleanedCount = cleanupInactiveUsers();
      if (cleanedCount > 0) {
        io.emit("system_notification", {
          type: "info",
          message: `系统已清理 ${cleanedCount} 个超过50天未活跃的用户账户`
        });
      }
      // 递归调用，安排下一次清理
      scheduleCleanup();
    }, timeUntilTomorrow);
  };
  
  // 立即安排第一次清理
  scheduleCleanup();

  // WebSocket连接处理
  io.on("connection", (socket) => {
    console.log("新用户连接:", socket.id);

    // 用户加入聊天室，需要提供userId、username和coreId
    socket.on("join", ({ userId, username, coreId }) => {
      if (!userId || !username || !coreId) {
        console.log(`用户验证失败：缺少必要信息`);
        socket.emit("user_id_failed", { message: "缺少用户ID、用户名或coreId" });
        return;
      }

      // 检查用户是否被踢出且仍在禁期内
      if (global.kickedUsers && global.kickedUsers.has(userId)) {
        const kickInfo = global.kickedUsers.get(userId);
        const now = Date.now();
        
        // 检查是否仍在禁期内
        if (kickInfo.unbanTimestamp === 0 || now < kickInfo.unbanTimestamp) {
          const remainingTime = kickInfo.unbanTimestamp === 0 ? 
            '永久' : 
            Math.ceil((kickInfo.unbanTimestamp - now) / (60 * 1000)) + '分钟';
          
          console.log(`用户 ${username} 尝试重新连接，但仍在禁期内，剩余时间: ${remainingTime}`);
          socket.emit("user_banned", {
            message: `您已被管理员 ${kickInfo.kickedByUsername} 踢出聊天室`,
            reason: kickInfo.reason,
            duration: kickInfo.duration,
            remainingTime: remainingTime,
            timestamp: kickInfo.timestamp
          });
          
          // 断开连接
          socket.disconnect(true);
          return;
        } else {
          // 禁期已过，移除踢人记录
          global.kickedUsers.delete(userId);
          console.log(`用户 ${username} 禁期已过，允许重新连接`);
        }
      }

      // 检查 userId 是否已存在于其他 socket
      if (userInfoMap.has(userId)) {
        const existingSocketId = Array.from(onlineUsers.entries()).find(([_, uid]) => uid === userId)?.[0];
        if (existingSocketId && existingSocketId !== socket.id) {
          console.log(`检测到重复 userId ${userId}，断开旧连接 ${existingSocketId}`);
          io.sockets.sockets.get(existingSocketId)?.disconnect(true);
          onlineUsers.delete(existingSocketId);
        }
      }

      // 记录在线用户 (socket.id -> userId)
      onlineUsers.set(socket.id, userId);

      // 初始化或更新用户信息
      if (!userInfoMap.has(userId)) {
        userInfoMap.set(userId, { userId, username, nickname: username, coreId });
      } else {
        // 更新最新的用户名和coreId（允许重名）
        const info = userInfoMap.get(userId);
        info.username = username;
        info.coreId = coreId;
        userInfoMap.set(userId, info);
      }

      // 获取用户积分信息
      const userPoints = getUserPoints(coreId);
      const canClaim = canClaimDailyPoints(coreId);
      const userInfo = getUserInfo(coreId);
      
      // 获取用户神秘商店信息
      const mysteryShopInfo = getUserMysteryShopInfo(coreId);

      console.log(`${username} 加入聊天室，用户ID: ${userId}, coreId: ${coreId}, 积分: ${userPoints}`);

      socket.emit("chat_history", chatHistory);
      
      // 发送用户积分信息
      socket.emit("points_info", {
        coreId,
        points: userPoints,
        canClaimDaily: canClaim,
        onlineMinutes: userInfo?.onlineMinutes || 0
      });
      
      // 发送用户神秘商店信息
      socket.emit("mystery_shop_info", mysteryShopInfo);

      const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
        // 获取每个用户的积分信息
        const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
        // 获取用户的头像框和动画信息
        const userHasAvatarFrame = userInfo.coreId ? hasAvatarFrame(userInfo.coreId) : false;
        const userHasEntranceAnimation = userInfo.coreId ? hasEntranceAnimation(userInfo.coreId) : false;
        const userHasSvip = userInfo.coreId ? hasSvip(userInfo.coreId) : false;
        
        return {
          ...userInfo,
          points: userPoints,
          hasAvatarFrame: userHasAvatarFrame,
          hasEntranceAnimation: userHasEntranceAnimation,
          hasSvip: userHasSvip
        };
      });

      // 检查用户是否有入场动画
      const userHasEntranceAnimation = hasEntranceAnimation(coreId);
      
      io.emit("user_join", {
        username,
        userId,
        coreId,
        nickname: userInfoMap.get(userId)?.nickname || username,
        points: userPoints,
        users: usersList,
      });
      
      // 如果用户有入场动画，则广播给所有用户
      if (userHasEntranceAnimation) {
        io.emit("show_entrance_animation", {
          username,
          userId,
          coreId,
          nickname: userInfoMap.get(userId)?.nickname || username
        });
        console.log(`用户 ${username} 有入场动画，已广播给所有用户`);
      }
    });

  // 接收消息并广播
  socket.on("chat_message", async (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || userId !== data.userId) {
        console.log(`消息发送验证失败：用户ID不匹配或用户不存在`);
        socket.emit("user_id_failed", { message: "用户验证失败，请重新输入用户名" });
        return;
      }

      console.log(
        socket.request.connection.remoteAddress,
        userInfo.nickname,
        "说:",
        data.content
      );

      let processedMessage = { ...data };

      if (processedMessage.userName && !processedMessage.username) {
        processedMessage.username = processedMessage.userName;
        delete processedMessage.userName;
      }
      // 使用最新的昵称（如果已更新）
      processedMessage.username = userInfo.nickname; 
      
      processedMessage.id = Date.now().toString();
      processedMessage.timestamp = Date.now(); // 使用时间戳而不是格式化后的字符串
      processedMessage.userId = data.userId;
      processedMessage.localId = data.localId;

      if (processedMessage.quote) {
        const quotedInfo = Array.from(userInfoMap.values()).find(info => info.username === processedMessage.quote.username);
        processedMessage.quote.userId = quotedInfo?.userId || "";
      }

      if (data.mentionedUserIds && Array.isArray(data.mentionedUserIds)) {
        processedMessage.mentionedUserIds = data.mentionedUserIds;
        
        if (!processedMessage.mentions) {
          processedMessage.mentions = [];
          data.mentionedUserIds.forEach(uid => {
            const info = userInfoMap.get(uid);
            const name = info?.username;
            if (name && !processedMessage.mentions.includes(name)) {
              processedMessage.mentions.push(name);
            }
          });
        }
      }

      // 添加用户的头像框和SVIP信息到消息对象
      const userHasAvatarFrame = userInfo.coreId ? hasAvatarFrame(userInfo.coreId) : false;
      const userHasSvip = userInfo.coreId ? hasSvip(userInfo.coreId) : false;
      processedMessage.hasAvatarFrame = userHasAvatarFrame;
      processedMessage.hasSvip = userHasSvip;

      chatHistory.push(processedMessage);
      if (chatHistory.length > MAX_HISTORY) {
        chatHistory.shift();
      }

      io.emit("chat_message", processedMessage);

      // 自动回复触发：当消息以 "/"开头时，生成一个明星账号的回复
      try {
        const rawContent = (data && data.content) ? String(data.content) : '';
        const match = rawContent.match(/^\s*\/\s*(.+)/i);
        if (match && !processedMessage.star) {
          const triggerText = match[1];
          const star = starService.pickStar();
          const starName = star.name;
          const palette = star.gradient;
          let replyText = '';
          try {
            replyText = await starService.generateStarReply(triggerText);
          } catch (aiErr) {
            console.error('调用生成回复时出错，回退到本地生成：', aiErr);
            // 使用本地生成函数回退
            try {
              replyText = starService.generateLocalStarReply(triggerText);
            } catch (localErr) {
              console.error('回退到本地生成也失败：', localErr);
              replyText = '谢谢你的问题，我会尽快回复。';
            }
          }

          const starMessage = {
            id: Date.now().toString() + '_star' + Math.floor(Math.random() * 1000),
            timestamp: Date.now(),
            userId: `star_system_${Math.floor(Math.random() * 100000)}`,
            username: starName,
            nickname: starName,
            content: replyText,
            type: 'ai',
            localId: null,
            // 前端根据这个字段渲染更绚丽的头像与消息气泡
            star: true,
            starGradient: { from: palette[0], to: palette[1] },
            // 明星账号默认有头像框
            hasAvatarFrame: true
          };

          // 模拟人工延迟回复
          setTimeout(() => {
            try {
              chatHistory.push(starMessage);
              if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
              io.emit('chat_message', starMessage);
            } catch (e) {
              console.error('发送明星自动回复失败：', e);
            }
          }, 300);
        }
      } catch (e) {
        console.error('处理自动回复触发时出错：', e);
      }
    });

    // 处理弹幕消息
    socket.on('danmu_message', (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      if (!userInfo || userId !== data.userId) {
        console.log(`弹幕发送验证失败：用户ID不匹配或用户不存在`);
        return;
      }

      console.log(`${userInfo.nickname} 发送了弹幕: ${data.content}`);

      const danmuData = {
        content: data.content,
        color: data.color,
        username: userInfo.nickname,
        userId: userId,
        timestamp: data.timestamp
      };
      io.emit('danmu_message', danmuData);
    });

    // 处理消息撤回
    socket.on('recall_message', (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || userId !== data.userId) {
        console.log(`消息撤回失败：用户ID不匹配或用户不存在`);
        socket.emit("recall_failed", { message: "用户验证失败" });
        return;
      }

      // 查找要撤回的消息
      const messageIndex = chatHistory.findIndex(msg => msg.id === data.messageId);
      
      if (messageIndex === -1) {
        console.log(`消息撤回失败：消息不存在，消息ID: ${data.messageId}`);
        socket.emit("recall_failed", { message: "消息不存在或无权限撤回" });
        return;
      }

      const message = chatHistory[messageIndex];
      
      // 检查消息是否属于当前用户
      if (message.userId !== userId) {
        console.log(`消息撤回失败：无权限撤回此消息`);
        socket.emit("recall_failed", { message: "无权限撤回此消息" });
        return;
      }
      
      // 检查消息发送时间，只允许撤回2分钟内的消息
      const now = Date.now();
      const messageTime = message.timestamp || Date.parse(message.timestamp);
      const timeDiff = now - messageTime;
      const twoMinutes = 2 * 60 * 1000; // 2分钟的毫秒数
      
      if (timeDiff > twoMinutes) {
        console.log(`消息撤回失败：超过撤回时间限制`);
        socket.emit("recall_failed", { message: "消息发送超过2分钟，无法撤回" });
        return;
      }

      // 标记消息为已撤回
      chatHistory[messageIndex] = {
        ...message,
        recalled: true,
        content: "此消息已被撤回",
        type: "recalled"
      };

      // 广播消息撤回事件
      io.emit("message_recalled", {
        messageId: data.messageId,
        userId: userId
      });
    });

    // 处理获取积分请求
    socket.on("get_points", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("points_error", { message: "用户信息不完整" });
        return;
      }
      
      const userPoints = getUserPoints(userInfo.coreId);
      const canClaim = canClaimDailyPoints(userInfo.coreId);
      const userData = getUserInfo(userInfo.coreId);
      
      socket.emit("points_info", {
        coreId: userInfo.coreId,
        points: userPoints,
        canClaimDaily: canClaim,
        onlineMinutes: userData?.onlineMinutes || 0,
        lastClaimDate: userData?.lastDailyClaim || null
      });
    });

    // 处理宠物互动积分
    socket.on("pet_interaction_points", (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("pet_interaction_points_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 验证积分值
      const points = data.points || 0;
      if (points <= 0) {
        socket.emit("pet_interaction_points_failed", { message: "无效的积分值" });
        return;
      }
      
      // 添加宠物互动积分
      const result = addUserPoints(userInfo.coreId, points);
      
      if (result && result.success) {
        const updatedPoints = result.points;
        
        // 发送积分更新成功通知给用户
        socket.emit("pet_interaction_points_success", {
          coreId: userInfo.coreId,
          points: updatedPoints,
          addedPoints: points
        });
        
        // 广播积分更新通知给所有用户
        io.emit("points_updated", {
          coreId: userInfo.coreId,
          points: updatedPoints,
          addedPoints: points
        });
        
        // 更新用户列表中的积分
        const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
          const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
          const userHasAvatarFrame = userInfo.coreId ? hasAvatarFrame(userInfo.coreId) : false;
          const userHasEntranceAnimation = userInfo.coreId ? hasEntranceAnimation(userInfo.coreId) : false;
          const userHasSvip = userInfo.coreId ? hasSvip(userInfo.coreId) : false;
          
          return {
            ...userInfo,
            points: userPoints,
            hasAvatarFrame: userHasAvatarFrame,
            hasEntranceAnimation: userHasEntranceAnimation,
            hasSvip: userHasSvip
          };
        });
        
        // 广播更新后的用户列表
        io.emit("users_updated", updatedUsersList);
        
        console.log(`用户 ${userInfo.username} 通过宠物互动获得 ${points} 积分，当前积分: ${updatedPoints}`);
      } else {
        socket.emit("pet_interaction_points_failed", { message: "积分添加失败" });
      }
    });

    // 处理每日积分领取
    socket.on("claim_daily_points", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("claim_points_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 检查是否可以领取每日积分
      if (!canClaimDailyPoints(userInfo.coreId)) {
        socket.emit("claim_points_failed", { message: "今日已领取过积分" });
        return;
      }
      
      // 领取每日积分
      const success = claimDailyPoints(userInfo.coreId);
      if (success) {
        const updatedPoints = getUserPoints(userInfo.coreId);
        const canClaim = canClaimDailyPoints(userInfo.coreId);
        
        socket.emit("claim_points_success", {
          coreId: userInfo.coreId,
          points: updatedPoints,
          claimedPoints: 100,
          canClaimDaily: canClaim
        });
        
        // 广播更新后的用户列表给所有用户，确保积分显示正确
        const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          const userInfo = userInfoMap.get(uid) || { userId: uid, username: null };
          // 获取每个用户的最新积分信息
          const userPoints = userInfo.coreId ? getUserPoints(userInfo.coreId) : 0;
          const userHasSvip = userInfo.coreId ? hasSvip(userInfo.coreId) : false;
          return {
            ...userInfo,
            points: userPoints,
            hasSvip: userHasSvip
          };
        });
        
        // 广播更新后的用户列表
        io.emit("users_updated", updatedUsersList);
        
        console.log(`用户 ${userInfo.username} 领取了每日100积分，当前积分: ${updatedPoints}`);
      } else {
        socket.emit("claim_points_failed", { message: "领取积分失败" });
      }
    });

    // 处理踢人请求
    socket.on('kick_user', (data) => {
      const adminId = onlineUsers.get(socket.id);
      const adminInfo = userInfoMap.get(adminId);
      
      // 验证管理员身份（暂时简化为检查用户是否在线）
      if (!adminInfo) {
        console.log(`踢人失败：用户 ${adminId} 不存在或未登录`);
        socket.emit("kick_failed", { message: "用户未登录" });
        return;
      }
      
      const { userId, username, duration } = data;
      
      // 如果提供了userId，直接使用；否则通过username查找
      let targetUserId = userId;
      let targetUserInfo = userInfoMap.get(userId);
      
      if (!targetUserId && username) {
        // 通过username查找userId
        for (const [uid, info] of userInfoMap.entries()) {
          if (info.username === username || info.nickname === username) {
            targetUserId = uid;
            targetUserInfo = info;
            break;
          }
        }
      }
      
      if (!targetUserInfo) {
        console.log(`踢人失败：目标用户 ${userId || username} 不存在`);
        socket.emit("kick_failed", { message: "目标用户不存在" });
        return;
      }
      
      // 不能踢自己
      if (targetUserId === adminId) {
        console.log(`踢人失败：管理员尝试踢自己`);
        socket.emit("kick_failed", { message: "不能踢出自己" });
        return;
      }
      
      // 查找目标用户的socket
      let targetSocketId = null;
      for (const [sid, uid] of onlineUsers.entries()) {
        if (uid === targetUserId) {
          targetSocketId = sid;
          break;
        }
      }
      
      if (!targetSocketId) {
        console.log(`踢人失败：目标用户 ${targetUserId} 不在线`);
        socket.emit("kick_failed", { message: "目标用户不在线" });
        return;
      }
      
      // 记录踢人信息
      const kickInfo = {
        kickedUserId: targetUserId,
        kickedByUsername: adminInfo.nickname,
        kickedByUserId: adminId,
        duration: duration, // 分钟数，0表示永久
        timestamp: Date.now(),
        reason: data.reason || "违反聊天室规定"
      };
      
      // 存储踢人信息
      if (!global.kickedUsers) {
        global.kickedUsers = new Map();
      }
      
      // 计算解禁时间戳
      let unbanTimestamp = 0;
      if (duration > 0) {
        unbanTimestamp = Date.now() + (duration * 60 * 1000);
      }
      
      global.kickedUsers.set(targetUserId, {
        ...kickInfo,
        unbanTimestamp
      });
      
      // 通知被踢用户
      io.to(targetSocketId).emit("user_kicked", {
        message: `您已被管理员 ${adminInfo.nickname} 踢出聊天室`,
        duration: duration,
        reason: kickInfo.reason,
        timestamp: kickInfo.timestamp
      });
      
      // 断开目标用户连接
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      
      // 从在线用户列表中移除
      onlineUsers.delete(targetSocketId);
      
      // 向管理员发送踢人成功通知
      socket.emit("kick_success", {
        message: `已成功踢出用户 ${targetUserInfo.nickname}`,
        kickedUserId: targetUserId,
        kickedUsername: targetUserInfo.nickname,
        duration: duration
      });
      
      // 广播踢人事件给其他用户
      socket.broadcast.emit("user_kicked_notification", {
        kickedUserId: targetUserId,
        kickedUsername: targetUserInfo.nickname,
        kickedByUsername: adminInfo.nickname,
        duration: duration,
        timestamp: kickInfo.timestamp
      });
      
      // 更新用户列表
      const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        const user = userInfoMap.get(uid) || { userId: uid, username: null };
        const userHasSvip = user.coreId ? hasSvip(user.coreId) : false;
        
        return {
          ...user,
          hasSvip: userHasSvip
        };
      });
      
      io.emit("user_list_updated", usersList);
      
      console.log(`管理员 ${adminInfo.nickname} 踢出了用户 ${targetUserInfo.nickname}，时长: ${duration === 0 ? '永久' : duration + '分钟'}`);
    });

    // 处理创建红包请求
    socket.on("create_red_packet", (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("create_red_packet_failed", { message: "用户信息不完整" });
        return;
      }
      
      const { type, totalAmount, count, message } = data;
      
      // 验证参数
      if (!type || !totalAmount || !count) {
        socket.emit("create_red_packet_failed", { message: "红包参数不完整" });
        return;
      }
      
      // 验证红包类型
      if (type !== 'random' && type !== 'average') {
        socket.emit("create_red_packet_failed", { message: "红包类型无效" });
        return;
      }
      
      // 验证金额和数量
      if (totalAmount <= 0 || count <= 0) {
        socket.emit("create_red_packet_failed", { message: "金额或数量必须大于0" });
        return;
      }
      
      // 检查用户积分是否足够
      const userPoints = getUserPoints(userInfo.coreId);
      if (userPoints < totalAmount) {
        socket.emit("create_red_packet_failed", { message: "积分不足" });
        return;
      }
      
      // 创建红包
      const redPacket = createRedPacket(
        userInfo.coreId,
        userId,
        userInfo.nickname || userInfo.username,
        type,
        totalAmount,
        count,
        message
      );
      
      if (redPacket.success) {
        // 扣除用户积分
        console.log(`准备扣除用户 ${userInfo.coreId} 的积分，当前积分: ${getUserPoints(userInfo.coreId)}，要扣除: ${totalAmount}`);
        const pointsDeducted = reduceUserPoints(userInfo.coreId, totalAmount);
        console.log(`积分扣除结果: ${pointsDeducted}，扣除后积分: ${getUserPoints(userInfo.coreId)}`);
        
        if (!pointsDeducted) {
          socket.emit("create_red_packet_failed", { message: "积分扣除失败" });
          return;
        }
        
        // 更新用户列表中的积分和头像框/动画信息
        const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          const user = userInfoMap.get(uid) || { userId: uid, username: null };
          const userPoints = user.coreId ? getUserPoints(user.coreId) : 0;
          const userHasAvatarFrame = user.coreId ? hasAvatarFrame(user.coreId) : false;
          const userHasEntranceAnimation = user.coreId ? hasEntranceAnimation(user.coreId) : false;
          const userHasSvip = user.coreId ? hasSvip(user.coreId) : false;
          
          return {
            ...user,
            points: userPoints,
            hasAvatarFrame: userHasAvatarFrame,
            hasEntranceAnimation: userHasEntranceAnimation,
            hasSvip: userHasSvip
          };
        });
        
        // 发送创建成功事件
        socket.emit("create_red_packet_success", {
          redPacketId: redPacket.redPacketId,
          totalAmount: redPacket.redPacket.totalAmount,
          count: redPacket.redPacket.totalCount,
          remainingPoints: getUserPoints(userInfo.coreId)
        });
        
        // 广播红包消息给所有用户
        io.emit("new_red_packet", {
          id: redPacket.redPacketId,
          senderId: userId,
          senderName: userInfo.nickname || userInfo.username,
          type: redPacket.redPacket.type,
          totalAmount: redPacket.redPacket.totalAmount,
          count: redPacket.redPacket.totalCount,
          remainingCount: redPacket.redPacket.totalCount, // 初始剩余数量等于总数量
          totalCount: redPacket.redPacket.totalCount,
          message: redPacket.redPacket.greeting,
          timestamp: Date.now(),
          status: redPacket.redPacket.status
        });
        
        // 广播更新后的用户列表
        io.emit("users_updated", updatedUsersList);
        
        // 广播积分更新通知给所有用户
        io.emit("points_updated", {
          coreId: userInfo.coreId,
          points: getUserPoints(userInfo.coreId),
          addedPoints: -totalAmount
        });
        
        console.log(`用户 ${userInfo.nickname} 创建了一个${type === 'random' ? '随机' : '平均'}红包，总金额: ${totalAmount}，数量: ${count}`);
      } else {
        socket.emit("create_red_packet_failed", { message: "创建红包失败" });
      }
    });

    // 处理领取红包请求
    socket.on("receive_red_packet", async (data) => {
      console.log(`[SOCKET] 收到领取红包请求:`, {
        socketId: socket.id,
        data: data
      });
      
      try {
        const userId = onlineUsers.get(socket.id);
        const userInfo = userInfoMap.get(userId);
        
        console.log(`[SOCKET] User info:`, {
          userId,
          userInfo: !!userInfo,
          coreId: userInfo?.coreId,
          username: userInfo?.username || userInfo?.nickname
        });
        
        if (!userInfo || !userInfo.coreId) {
          console.log(`[SOCKET] 用户信息验证失败`);
          socket.emit("receive_red_packet_failed", { message: "用户信息不完整" });
          return;
        }
        
        // 验证请求数据
        if (!data || !data.redPacketId) {
          console.log(`[SOCKET] 请求数据验证失败: 缺少红包ID`);
          socket.emit("receive_red_packet_failed", { message: "请求数据无效" });
          return;
        }
        
        const { redPacketId, coreId } = data;
        
        console.log(`[SOCKET] Extracted parameters:`, {
          redPacketId,
          coreId,
          userCoreId: userInfo.coreId
        });
        
        // 优先使用前端传递的coreId，如果没有则使用userInfo中的coreId
        const userCoreId = coreId || userInfo.coreId;
        
        console.log(`[SOCKET] Final userCoreId:`, userCoreId);
        
        // 领取红包
        console.log(`[SOCKET] Calling receiveRedPacket function...`);
        const result = receiveRedPacket(redPacketId, userCoreId, userId, userInfo.nickname || userInfo.username);
        
        console.log(`[SOCKET] 红包领取结果:`, result);
        
        if (result.success) {
          try {
            // 增加用户积分
            console.log(`[SOCKET] Adding user points:`, {
              userCoreId,
              points: result.amount
            });
            
            const pointsResult = addUserPoints(userCoreId, result.amount);
            
            console.log(`[SOCKET] Points addition result:`, pointsResult);
            
            // 更新用户列表中的积分和头像框/动画信息
            const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
              const user = userInfoMap.get(uid) || { userId: uid, username: null };
              const userPoints = user.coreId ? getUserPoints(user.coreId) : 0;
              const userHasAvatarFrame = user.coreId ? hasAvatarFrame(user.coreId) : false;
              const userHasEntranceAnimation = user.coreId ? hasEntranceAnimation(user.coreId) : false;
              const userHasSvip = user.coreId ? hasSvip(user.coreId) : false;
              
              return {
                ...user,
                points: userPoints,
                hasAvatarFrame: userHasAvatarFrame,
                hasEntranceAnimation: userHasEntranceAnimation,
                hasSvip: userHasSvip
              };
            });
            
            // 发送领取成功事件
            socket.emit("receive_red_packet_success", {
              redPacketId: redPacketId,
              amount: result.amount,
              message: result.message,
              remainingPoints: getUserPoints(userCoreId),
              pointsAdded: true
            });
            
            // 广播红包状态更新
            io.emit("red_packet_status_update", {
              redPacketId: redPacketId,
              status: result.status,
              remainingCount: result.remainingCount,
              totalCount: result.totalCount
            });
            
            // 如果红包已领完，广播红包完成事件
            if (result.status === 'completed') {
              io.emit("red_packet_completed", {
                redPacketId: redPacketId,
                totalAmount: result.totalAmount,
                totalCount: result.totalCount
              });
            }
            
            // 广播更新后的用户列表
            io.emit("users_updated", updatedUsersList);
            
            // 广播积分更新通知给所有用户
            io.emit("points_updated", {
              coreId: userCoreId,
              points: getUserPoints(userCoreId),
              addedPoints: result.amount
            });
            
            console.log(`用户 ${userInfo.nickname} 领取了红包，金额: ${result.amount}`);
          } catch (pointsError) {
            console.error(`[SOCKET] 积分添加异常:`, pointsError);
            socket.emit("receive_red_packet_failed", { 
              message: "积分添加异常，但红包领取成功" 
            });
          }
        } else {
          console.log(`[SOCKET] receiveRedPacket failed:`, result.message);
          socket.emit("receive_red_packet_failed", { 
            message: result.message || "领取红包失败" 
          });
        }
      } catch (error) {
        console.error(`[SOCKET] 领取红包处理异常:`, error);
        
        socket.emit("receive_red_packet_failed", {
          message: "领取红包时发生异常"
        });
      }
    });

    // 处理获取红包详情请求
    socket.on("get_red_packet_details", (data) => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("get_red_packet_details_failed", { message: "用户信息不完整" });
        return;
      }
      
      const { redPacketId, coreId } = data;
      
      if (!redPacketId) {
        socket.emit("get_red_packet_details_failed", { message: "红包ID不能为空" });
        return;
      }
      
      // 优先使用前端传递的coreId，如果没有则使用userInfo中的coreId
      const userCoreId = coreId || userInfo.coreId;
      
      // 获取红包详情
      const details = getRedPacketDetails(redPacketId, userCoreId);
      
      if (details) {
        // 检查用户是否已领取过该红包
        const hasReceived = details.receivers.some(r => r.coreId === userCoreId);
        
        socket.emit("get_red_packet_details_success", {
          redPacketId: redPacketId,
          senderName: details.senderName,
          type: details.type,
          totalAmount: details.totalAmount,
          count: details.totalCount,
          message: details.greeting,
          timestamp: details.createTime,
          status: details.status,
          receivers: details.receivers.map(r => ({
            userId: r.userId,
            username: r.username,
            coreId: r.coreId,
            amount: r.amount,
            timestamp: r.receiveTime
          })),
          hasReceived: hasReceived
        });
      } else {
        socket.emit("get_red_packet_details_failed", { message: "红包不存在或已过期" });
      }
    });

    // 处理获取用户红包历史请求
    socket.on("get_user_red_packet_history", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("get_user_red_packet_history_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 获取用户红包历史
      const history = getUserRedPacketHistory(userInfo.coreId, userInfo.userId);
      
      socket.emit("get_user_red_packet_history_success", {
        history: history
      });
    });

    // 处理获取神秘商店信息请求
    socket.on("get_mystery_shop_info", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("get_mystery_shop_info_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 获取用户神秘商店信息
      const mysteryShopInfo = getUserMysteryShopInfo(userInfo.coreId);
      
      socket.emit("get_mystery_shop_info_success", mysteryShopInfo);
    });

    // 处理抽取神秘礼物请求
    socket.on("draw_mystery_reward", () => {
      const userId = onlineUsers.get(socket.id);
      const userInfo = userInfoMap.get(userId);
      
      if (!userInfo || !userInfo.coreId) {
        socket.emit("draw_mystery_reward_failed", { message: "用户信息不完整" });
        return;
      }
      
      // 抽取神秘礼物
      const result = drawMysteryReward(userInfo.coreId);
      
      if (result.success) {
        // 获取更新后的用户信息
        const updatedPoints = getUserPoints(userInfo.coreId);
        const mysteryShopInfo = getUserMysteryShopInfo(userInfo.coreId);
        
        // 发送抽取结果
        socket.emit("draw_mystery_reward_success", {
          reward: result.reward,
          message: result.message,
          points: updatedPoints,
          mysteryShopInfo: mysteryShopInfo
        });
        
        // 更新用户列表中的积分和头像框/动画信息
        const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          const user = userInfoMap.get(uid) || { userId: uid, username: null };
          const userPoints = user.coreId ? getUserPoints(user.coreId) : 0;
          const userHasAvatarFrame = user.coreId ? hasAvatarFrame(user.coreId) : false;
          const userHasEntranceAnimation = user.coreId ? hasEntranceAnimation(user.coreId) : false;
          
          return {
            ...user,
            points: userPoints,
            hasAvatarFrame: userHasAvatarFrame,
            hasEntranceAnimation: userHasEntranceAnimation
          };
        });
        
        // 广播更新后的用户列表
        io.emit("users_updated", updatedUsersList);
        
        // 广播积分更新通知给所有用户
        let addedPoints = -100; // 抽取消耗100积分
        
        // 如果抽中积分奖励，加上奖励的积分
        if (result.reward && result.reward.type === "points_reward") {
          addedPoints += result.reward.pointsAwarded;
        }
        
        io.emit("points_updated", {
          coreId: userInfo.coreId,
          points: updatedPoints,
          addedPoints: addedPoints
        });
        
        // 如果抽中了头像框或动画，广播特殊通知
        if (result.reward && (result.reward.type === "avatar_frame" || result.reward.type === "entrance_animation")) {
          io.emit("special_reward_notification", {
            userId: userId,
            username: userInfo.nickname || userInfo.username,
            rewardType: result.reward.type,
            rewardName: result.reward.name,
            message: `${userInfo.nickname || userInfo.username} 抽中了 ${result.reward.name}！`
          });
        }
        
        console.log(`用户 ${userInfo.nickname} 抽取了神秘礼物，结果: ${result.message}`);
      } else {
        socket.emit("draw_mystery_reward_failed", { message: result.message });
      }
    });

    // 用户断开连接
    socket.on("disconnect", () => {
      const userId = onlineUsers.get(socket.id);
      if (userId) {
        onlineUsers.delete(socket.id);
        console.log(`用户 ${userId} 离开聊天室`);

        // 获取用户信息
        const userInfo = userInfoMap.get(userId);
        
        // 重置用户在线时长，防止断开连接后继续累积
        if (userInfo && userInfo.coreId) {
          resetUserOnlineMinutes(userInfo.coreId);
          console.log(`已重置用户 ${userInfo.username} 的在线时长`);
        }

        const hasOtherConnections = Array.from(onlineUsers.values()).includes(userId);
        if (!hasOtherConnections) {
          userInfoMap.delete(userId);
        }

        const usersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
          const user = userInfoMap.get(uid) || { userId: uid, username: null };
          const userPoints = user.coreId ? getUserPoints(user.coreId) : 0;
          const userHasAvatarFrame = user.coreId ? hasAvatarFrame(user.coreId) : false;
          const userHasEntranceAnimation = user.coreId ? hasEntranceAnimation(user.coreId) : false;
          const userHasSvip = user.coreId ? hasSvip(user.coreId) : false;
          
          return {
            ...user,
            points: userPoints,
            hasAvatarFrame: userHasAvatarFrame,
            hasEntranceAnimation: userHasEntranceAnimation,
            hasSvip: userHasSvip
          };
        });

        io.emit("user_leave", {
          userId,
          users: usersList,
        });
      }
    });
  });
  
  // 定时清理过期红包（每5分钟执行一次）
  setInterval(() => {
    const expiredRedPackets = cleanupExpiredRedPackets();
    
    if (expiredRedPackets.length > 0) {
      console.log(`清理了 ${expiredRedPackets.length} 个过期红包`);
      
      // 更新用户列表中的积分和头像框/动画信息
      const updatedUsersList = Array.from(onlineUsers.entries()).map(([sid, uid]) => {
        const user = userInfoMap.get(uid) || { userId: uid, username: null };
        const userPoints = user.coreId ? getUserPoints(user.coreId) : 0;
        const userHasAvatarFrame = user.coreId ? hasAvatarFrame(user.coreId) : false;
        const userHasEntranceAnimation = user.coreId ? hasEntranceAnimation(user.coreId) : false;
        const userHasSvip = user.coreId ? hasSvip(user.coreId) : false;
        
        return {
          ...user,
          points: userPoints,
          hasAvatarFrame: userHasAvatarFrame,
          hasEntranceAnimation: userHasEntranceAnimation,
          hasSvip: userHasSvip
        };
      });
      
      // 广播更新后的用户列表
      io.emit("users_updated", updatedUsersList);
      
      // 通知所有客户端过期红包已退款
      expiredRedPackets.forEach(redPacket => {
        if (redPacket.remainingAmount > 0) {
          // 退还剩余积分给发送者
          addUserPoints(redPacket.senderCoreId, redPacket.remainingAmount);
          
          // 通知发送者
          const senderSocketId = Array.from(onlineUsers.entries()).find(
            ([_, userId]) => {
              const userInfo = userInfoMap.get(userId);
              return userInfo && userInfo.coreId === redPacket.senderCoreId;
            }
          )?.[0];
          
          if (senderSocketId) {
            io.to(senderSocketId).emit("red_packet_expired", {
              redPacketId: redPacket.id,
              refundAmount: redPacket.remainingAmount,
              message: "红包已过期，剩余积分已退还"
            });
          }
        }
      });
    }
  }, 5 * 60 * 1000); // 5分钟
};