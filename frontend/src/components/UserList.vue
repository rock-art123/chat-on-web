<template>
  <div class="user-list">
    <!-- 加载状态 - 骨架屏 -->
    <div v-if="isLoading" class="skeleton-container">
      <h3>在线 (0)</h3>
      <div class="user-items">
        <!-- 生成5个骨架屏用户项 -->
        <div v-for="i in 5" :key="i" class="skeleton-user-item">
          <div class="skeleton-avatar"></div>
          <div class="user-info">
            <div class="skeleton-username"></div>
            <div class="user-stats">
              <div class="skeleton-hotness"></div>
              <div class="skeleton-points"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 用户列表 -->
    <div v-else>
      <h3 class="user-list-title">在线 ({{ sortedUsers.length }})</h3>
      <div class="user-items">
        <div
          v-for="user in sortedUsers"
          :key="user.userId || user.username"
          class="user-item"
          :class="{ 'current-user': isCurrentUser(user) }"
          @contextmenu="handleUserContextMenu($event, user)"
        >
          <div
            class="avatar"
            :class="{ 'avatar-frame': hasAvatarFrame(user) }"
            :style="{
              backgroundColor: getAvatarColor(getDisplayUsername(user)),
            }"
          >
            {{ getAvatarText(getDisplayUsername(user)) }}
            <span v-if="isCurrentUser(user)" class="current-user-indicator"
              >我</span
            >
            <span v-if="hasAvatarFrame(user)" class="vip-crown">👑</span>
          </div>
          <div class="user-info">
            <span class="username" :title="getDisplayUsername(user)">{{
              getDisplayUsername(user)
            }}
            <span v-if="hasSvip(user)" class="svip-tail">SVIP</span>
            </span>
            
            <div class="user-stats">
              <span class="hotness"> 🔥 {{ getMessageCount(user) }} </span>
              <span class="points"> 💰 {{ getUserPoints(user) }} </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from "vue";
import { getAvatarColor, getAvatarText } from "../utils/chatUtils";

export default {
  name: "UserList",
  props: {
    users: {
      type: Array,
      default: () => [],
    },
    messages: {
      type: Array,
      default: () => [],
    },
    userInfoMap: {
      type: Object,
      default: () => ({}),
    },
    currentUsername: {
      type: String,
      default: "",
    },
    currentUserId: {
      type: String,
      default: "",
    },
    isLoading: {
      type: Boolean,
      default: true,
    },
    mysteryShopInfo: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["userContextMenu"],
  setup(props, { emit }) {
    // 获取用户消息数量（热度）
    const getMessageCount = (user) => {
      const userId = user.userId;
      return props.messages.filter((m) => m.userId === userId).length;
    };

    // 获取用户积分
    const getUserPoints = (user) => {
      // 直接使用用户对象中的points字段，而不是从userInfoMap获取
      return user?.points || 0;
    };

    // 获取显示的用户名（优先使用昵称）
    const getDisplayUsername = (user) => {
      if (typeof user === "string") {
        return props.userInfoMap[user]?.nickname || user;
      }
      return (
        props.userInfoMap[user.username]?.nickname || user.username || user
      );
    };

    // 判断是否为当前用户，优先使用userId
    const isCurrentUser = (user) => {
      // 如果提供了currentUserId，优先使用userId匹配
      if (props.currentUserId) {
        return typeof user === "string"
          ? false // 字符串用户没有userId，无法匹配
          : user.userId === props.currentUserId;
      }
      // 降级处理：如果没有提供userId，则使用username匹配（保持兼容性）
      const username = typeof user === "string" ? user : user.username;
      return username === props.currentUsername;
    };

    // 判断用户是否有头像框
    const hasAvatarFrame = (user) => {
      // 如果是当前用户，检查mysteryShopInfo中的hasAvatarFrame
      if (isCurrentUser(user)) {
        return props.mysteryShopInfo?.hasAvatarFrame || false;
      }
      // 对于其他用户，检查用户对象中是否有hasAvatarFrame属性
      return typeof user === "object" && user.hasAvatarFrame === true;
    };

    // 判断用户是否有SVIP特权
    const hasSvip = (user) => {
      // 如果是当前用户，检查mysteryShopInfo中的hasSvip
      if (isCurrentUser(user)) {
        return props.mysteryShopInfo?.hasSvip || false;
      }
      // 对于其他用户，检查用户对象中是否有hasSvip属性
      return typeof user === "object" && user.hasSvip === true;
    };

    // 计算排序后的用户列表，当前用户置顶，其余按热度排序
    const sortedUsers = computed(() => {
      // 确保输入数据是对象数组
      const userObjects = props.users.map((user) => {
        if (typeof user === "string") {
          // 对于字符串用户，转换为对象格式，保留所有可能的字段
          return {
            username: user,
            userId: null, // 字符串用户没有userId
            points: 0, // 默认积分为0
          };
        }
        // 确保对象用户有points字段
        if (user.points === undefined) {
          user.points = 0;
        }
        return user;
      });

      // 使用Map进行去重，优先基于userId，没有userId再基于username
      const uniqueUsersMap = new Map();
      userObjects.forEach((user) => {
        if (user.userId) {
          uniqueUsersMap.set(user.userId, user);
        } else {
          uniqueUsersMap.set(user.username, user);
        }
      });
      const uniqueUsers = Array.from(uniqueUsersMap.values());

      // 分离当前用户和其他用户
      const currentUser = uniqueUsers.find((user) => isCurrentUser(user));
      const otherUsers = uniqueUsers.filter((user) => !isCurrentUser(user));

      // 对其他用户按消息数量（热度）降序排序
      otherUsers.sort((a, b) => {
        const countA = getMessageCount(a);
        const countB = getMessageCount(b);
        return countB - countA;
      });

      // 组合结果，当前用户置顶
      return currentUser ? [currentUser, ...otherUsers] : otherUsers;
    });

    // 处理用户右键菜单
    const handleUserContextMenu = (event, user) => {
      event.preventDefault();
      emit("userContextMenu", { event, user });
    };

    return {
      getAvatarColor,
      getAvatarText,
      getMessageCount,
      getUserPoints,
      sortedUsers,
      getDisplayUsername,
      isCurrentUser,
      hasAvatarFrame,
      hasSvip,
      handleUserContextMenu,
    };
  },
};
</script>

<style scoped>
.user-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--user-list-back-color);
  border-radius: 8px;
  padding: 0 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.user-list-title {
  margin: 12px 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.user-list-title::before {
  content: "👥";
  margin-right: 6px;
  font-size: 18px;
}

.user-items {
  flex: 1;
  overflow-y: auto;
  padding-right: 2px;
  height: calc(100vh - 80px);
  /* Firefox浏览器滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) var(--background-tertiary);
}

/* WebKit浏览器 (Chrome, Safari, Edge) 滚动条样式 */
.user-items::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.user-items::-webkit-scrollbar-track {
  background: transparent;
}

.user-items::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.user-items::-webkit-scrollbar-thumb:hover {
  background: rgba(128, 128, 128, 0.5);
}

.user-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 6px;
  background-color: var(--background-secondary);
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* 暗黑模式下的普通用户项样式 */
.theme-dark .user-item:not(.current-user) {
  background-color: rgba(255, 255, 255, 0.03);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.user-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12),
    inset 0 0 0 1px var(--accent-primary);
  background-color: var(--background-tertiary);
}

/* 暗黑模式下的悬浮效果 */
.theme-dark .user-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px var(--accent-primary);
}

.user-item.current-user {
  background-color: #dccfe1;
  box-shadow: 0 2px 6px rgba(var(--accent-primary-rgb), 0.15),
    inset 0 0 0 1px var(--accent-primary);
}

/* 暗黑模式下的当前用户样式 */
.theme-dark .user-item.current-user {
  border: 1px solid #54355c;
  background-color: rgba(var(--accent-primary-rgb), 0.1);
  box-shadow: 0 2px 8px rgba(var(--accent-primary-rgb), 0.2),
    inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.4);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  margin-right: 8px;
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 暗黑模式下的头像样式 */
.theme-dark .avatar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 头像框样式 */
.avatar-frame {
  position: relative;
  border: none;
  padding: 2px;
  background: linear-gradient(135deg, #FFD700, #FFA500, #FFD700, #FF8C00, #FFD700);
  background-size: 300% 300%;
  animation: avatar-frame-gradient 3s ease infinite;
  box-shadow: 
    0 0 0 1px rgba(255, 215, 0, 0.3),
    0 0 8px rgba(255, 215, 0, 0.5),
    0 0 15px rgba(255, 215, 0, 0.3);
}

/* 头像框内部装饰 */
.avatar-frame::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #FFD700, #FFA500, #FFD700, #FF8C00, #FFD700);
  background-size: 300% 300%;
  border-radius: 50%;
  z-index: -1;
  opacity: 0.8;
  animation: avatar-frame-gradient 4s ease infinite reverse;
}

/* 头像框外部光晕 */
.avatar-frame::after {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 215, 0, 0) 70%);
  border-radius: 50%;
  z-index: -2;
  animation: avatar-frame-pulse 2s ease-in-out infinite;
}

/* 暗黑模式下的头像框样式 */
.theme-dark .avatar-frame {
  box-shadow: 
    0 0 0 1px rgba(255, 215, 0, 0.4),
    0 0 10px rgba(255, 215, 0, 0.7),
    0 0 20px rgba(255, 215, 0, 0.5);
}

@keyframes avatar-frame-glow {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  100% {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* VIP王冠样式 */
.vip-crown {
  position: absolute;
  top: -10px;
  right: -10px;
  font-size: 16px;
  color: #FFD700;
  text-shadow: 
    0 0 8px rgba(255, 215, 0, 0.8),
    0 0 15px rgba(255, 215, 0, 0.6);
  animation: vip-crown-bounce 2s infinite;
  z-index: 2;
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.8));
  background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0) 70%);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 王冠装饰光点 */
.vip-crown::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 4px;
  height: 4px;
  background: #FFF;
  border-radius: 50%;
  animation: vip-crown-sparkle 1.5s infinite;
}

/* 暗黑模式下的王冠样式 */
.theme-dark .vip-crown {
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.9));
  text-shadow: 
    0 0 10px rgba(255, 215, 0, 0.9),
    0 0 20px rgba(255, 215, 0, 0.7);
}

@keyframes vip-crown-bounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-3px) scale(1.1);
  }
}

@keyframes avatar-frame-gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes avatar-frame-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes vip-crown-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes vip-crown-sparkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.current-user-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background-color: var(--success-color);
  color: white;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
  border: 1px solid var(--background-secondary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 暗黑模式下的当前用户指示器 */
.theme-dark .current-user-indicator {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许内容收缩 */
}

.username {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

/* 暗黑模式下的用户名 */
.theme-dark .username {
  color: rgba(255, 255, 255, 0.9);
}

.user-stats {
  display: flex;
  align-items: center;
  gap: 3px;
}

.hotness {
  font-size: 10px;
  color: var(--user-fire-color);
  font-weight: 500;
  background-color: var(--background-tertiary);
  padding: 1px 5px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

/* 暗黑模式下的热度标签 */
.theme-dark .hotness {
  background-color: rgba(255, 107, 53, 0.15);
  color: #ff9a76;
}

.points {
  font-size: 10px;
  color: var(--accent-primary);
  font-weight: 500;
  background-color: var(--background-tertiary);
  padding: 1px 5px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

/* 暗黑模式下的积分标签 */
.theme-dark .points {
  background-color: rgba(var(--accent-primary-rgb), 0.15);
  color: rgba(var(--accent-primary-rgb), 0.9);
}

/* SVIP小尾巴样式 */
.svip-tail {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #9333ea, #c026d3, #9333ea);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  display: inline-block;
  position: relative;
  box-shadow: 0 0 5px rgba(147, 51, 234, 0.5);
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);
  animation: svip-tail-glow 2s infinite alternate;
}

/* SVIP小尾巴装饰元素 */
.svip-tail::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 4px;
  z-index: 1;
}

.svip-tail::after {
  content: '✨';
  position: absolute;
  top: -3px;
  right: -3px;
  font-size: 8px;
  z-index: 2;
  animation: svip-tail-sparkle 1.5s infinite;
}

/* 暗黑模式下的SVIP小尾巴 */
.theme-dark .svip-tail {
  background: linear-gradient(135deg, #a855f7, #d946ef, #a855f7);
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.7);
}

/* SVIP小尾巴动画 */
@keyframes svip-tail-glow {
  0% {
    box-shadow: 0 0 5px rgba(147, 51, 234, 0.5);
  }
  100% {
    box-shadow: 0 0 10px rgba(147, 51, 234, 0.8);
  }
}

@keyframes svip-tail-sparkle {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.skeleton-container {
  padding: 12px 0;
}

.skeleton-user-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 6px;
  background-color: var(--background-secondary);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #e6f7ff;
  margin-right: 8px;
  animation: skeleton-loading 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-username {
  flex: 1;
  height: 13px;
  background-color: #f0f0f0;
  border-radius: 3px;
  animation: skeleton-loading 1.5s infinite;
  margin-bottom: 2px;
}

.skeleton-hotness {
  width: 40px;
  height: 16px;
  background-color: #fff7e6;
  border-radius: 8px;
  animation: skeleton-loading 1.5s infinite;
  margin-right: 6px;
}

.skeleton-points {
  width: 40px;
  height: 16px;
  background-color: #f0f9ff;
  border-radius: 8px;
  animation: skeleton-loading 1.5s infinite;
}

/* 暗黑模式下的骨架屏样式 */
.theme-dark .skeleton-user-item {
  background-color: rgba(255, 255, 255, 0.03);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.theme-dark .skeleton-avatar {
  background-color: rgba(255, 255, 255, 0.05);
}

.theme-dark .skeleton-username {
  background-color: rgba(255, 255, 255, 0.05);
}

.theme-dark .skeleton-hotness {
  background-color: rgba(255, 107, 53, 0.1);
}

.theme-dark .skeleton-points {
  background-color: rgba(var(--accent-primary-rgb), 0.1);
}

@keyframes skeleton-loading {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0.6;
  }
}
</style>
