<template>
  <!-- :class="['message-item', (message.userId && message.userId === currentUserId) || (!message.userId && message.username === currentUsername) ? 'self' : 'other']" -->
  <div 
    class="chat-messages" 
    ref="messagesContainer"
    :style="getBackgroundStyle()"
  >
    <!-- 加载状态 - 骨架屏 -->
    <div v-if="isLoading" class="skeleton-container">
      <!-- 生成8个骨架屏消息项 -->
      <div
        v-for="i in 8"
        :key="i"
        class="skeleton-message-item"
        :class="i % 2 === 0 ? 'self' : 'other'"
      >
        <div class="skeleton-message-header">
          <div class="skeleton-message-avatar"></div>
          <div class="skeleton-message-username"></div>
        </div>
        <div class="skeleton-message-content">
          <div class="skeleton-message-bubble">
            <div class="skeleton-message-line"></div>
            <div class="skeleton-message-line"></div>
            <div class="skeleton-message-line"></div>
          </div>
        </div>
        <div class="skeleton-message-time"></div>
      </div>
    </div>
    <!-- 聊天消息 -->
    <div v-else>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        :class="[getClass(message), message.star ? 'star' : '']"
      >
        <div class="message-header">
          <div v-if="message.star"
            class="avatar star-avatar"
            :style="{
              backgroundImage: `linear-gradient(135deg, ${message.starGradient?.from || '#FFD700'}, ${message.starGradient?.to || '#FF6B6B'})`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)'
            }"
            @contextmenu="($event) => handleUserContextMenu(getDisplayUsername(message))"
          >
            <span class="star-avatar-text">{{ getAvatarText(getDisplayUsername(message)) }}</span>
            <span class="star-badge">⭐</span>
          </div>
          <div v-else
            class="avatar"
            :class="{ 'avatar-frame': hasAvatarFrame(message) }"
            :style="{
              backgroundColor: getAvatarColor(getDisplayUsername(message)),
            }"
            @contextmenu="
              ($event) => handleUserContextMenu(getDisplayUsername(message))
            "
          >
            {{ getAvatarText(getDisplayUsername(message)) }}
            <span v-if="hasAvatarFrame(message)" class="vip-crown">👑</span>
          </div>
          <span class="username">{{ getDisplayUsername(message) }}</span>
        </div>
        <div
          class="message-content"
          @contextmenu="handleMessageContextMenu(message)"
        >
          <!-- 已撤回的消息显示 -->
          <div v-if="message.recalled || message.type === 'recalled'" class="recalled-message">
            <div class="recalled-content">
              <span class="recalled-icon">↩️</span>
              <span class="recalled-text">{{ message.content }}</span>
            </div>
          </div>
          <!-- 引用消息显示 - 所有消息类型都可能包含引用 -->
          <div v-else-if="message.quote" class="quoted-message">
            <div class="quoted-header">
              回复 @{{ getDisplayUsername(message.quote) }}:
            </div>
            <div class="quoted-content">
              <!-- 引用图片消息时显示缩略图 -->
              <div
                v-if="message.quote.type === 'image'"
                class="quoted-image-container"
              >
                <el-image
                  style="max-width: 150px; max-height: 100px; cursor: pointer"
                  :src="message.quote.imgUrl"
                  :preview-src-list="[message.quote.imgUrl]"
                  fit="cover"
                ></el-image>
              </div>
              <!-- 引用文本消息时使用QuoteMessage组件处理表情 -->
              <QuoteMessage
                v-else
                :message="message.quote.content"
                :data-info="message.quote"
                :user-info-map="userInfoMap"
              />
            </div>
            <!-- 移除直接显示message.content的pre标签，让QuoteMessage组件来处理所有内容显示 -->
            <QuoteMessage
              v-if="['text', 'emoText', 'quote','ai'].includes(message.type) && message.content"
              :class="['message-bubble', message.star ? 'star-bubble' : '']"
              :message="message.content"
              :data-info="message"
              :user-info-map="userInfoMap"
            ></QuoteMessage>
          </div>
          <!-- 引用消息类型 - 已经在上面显示了引用内容，这里不需要额外显示 -->
          <QuoteMessage
            v-else-if="['text', 'emoText', 'quote','ai'].includes(message.type) && message.content"
            :class="['message-bubble', message.star ? 'star-bubble' : '']"
            :message="message.content"
            :data-info="message"
            :user-info-map="userInfoMap"
          ></QuoteMessage>
          <!-- 图片消息，带有收藏按钮和右键菜单 -->
          <div
            v-else-if="message.type === 'image'"
            class="message-image-container"
          >
            <!-- 上传中状态 -->
            <div v-if="message.uploading" class="uploading-indicator">
              <div class="uploading-spinner"></div>
              <span class="uploading-text">上传中...</span>
            </div>
            <!-- 正常图片显示 -->
            <div v-else class="image-with-refresh">
              <el-image
                ref="imageRef"
                style="max-width: 300px; cursor: pointer"
                :src="getFullImageUrl(message.imgUrl)"
                :preview-src-list="[getFullImageUrl(message.imgUrl)]"
                fit="cover"
                :key="message.imageKey || message.imgUrl"
                @error="handleImageError(message)"
              >
                <template #error>
                  <div class="image-error">
                    <div class="error-icon">
                      <el-icon><Picture /></el-icon>
                    </div>
                    <div class="error-text">图片加载失败</div>
                    <el-button 
                      size="small" 
                      type="primary" 
                      @click="refreshImage(message)"
                      class="retry-btn"
                    >
                      重试
                    </el-button>
                  </div>
                </template>
              </el-image>
              <!-- 刷新按钮 - 只在客户端模式显示 -->
              <el-button
                v-if="isElectron()"
                class="image-refresh-btn"
                type="primary"
                size="small"
                circle
                @click="refreshImage(message)"
                title="刷新图片"
              >
                <Refresh class="refresh-icon" />
              </el-button>
            </div>
          </div>
          <!-- 红包消息 -->
          <RedPacketMessage
            v-else-if="message.type === 'redPacket'"
            :id="message.redPacketData.id"
            :sender-id="message.redPacketData.senderId"
            :sender-name="message.redPacketData.senderName"
            :type="message.redPacketData.type"
            :total-amount="message.redPacketData.totalAmount"
            :count="message.redPacketData.count"
            :total-count="message.redPacketData.totalCount"
            :message="message.redPacketData.message"
            :timestamp="message.redPacketData.timestamp"
            :status="message.redPacketData.status"
            :remaining-count="message.redPacketData.remainingCount"
            @receive-red-packet="(redPacketId) => $emit('openRedPacket', redPacketId)"
            @open-details="(redPacketId) => $emit('openRedPacket', redPacketId)"
          ></RedPacketMessage>
        </div>
        <div v-if="hasSvip(message)" class="svip-message-tail">
          <span class="svip-tail-text">来自尊贵的SVIP用户</span>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>
    <div
      class="new-message-alert"
      v-if="newMessageAlert"
      @click="
        scrollToBottom();
        newMessageAlert = false;
      "
    >
      <Bell class="alert-icon" />
      <span class="alert-text">您有新的消息</span>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { ElMessage, ElImage } from "element-plus";
import { Bell, Refresh, Picture } from "@element-plus/icons-vue";
import QuoteMessage from "./quoteMessage.vue";
import RedPacketMessage from "./RedPacketMessage.vue";
import { isElectron } from "../utils/electronUtils.js";
import dayjs from "dayjs";

export default {
  name: "MessageList",
  components: {
    QuoteMessage,
    RedPacketMessage,
  },
  props: {
    messages: {
      type: Array,
      default: () => [],
    },
    currentUsername: {
      type: String,
      default: "",
    },
    userInfoMap: {
      type: Object,
      default: () => ({}),
    },
    currentUserId: {
      type: String,
      default: "",
    },
    favoriteEmojis: {
      type: Array,
      default: () => [],
    },
    isLoading: {
      type: Boolean,
      default: true,
    },
    background: {
      type: String,
      default: "default",
    },
    mysteryShopInfo: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["messageContextMenu", "userContextMenu", "openRedPacket"],
  setup(props, { emit }) {
    const messagesContainer = ref(null);
    const newMessageAlert = ref(false);

    // 监听props变化，调试currentUserId
    watch(
      () => props.currentUserId,
      (newValue, oldValue) => {
        console.log("currentUserId changed:", oldValue, "->", newValue);
      }
    );

    // 滚动到底部
    const scrollToBottom = () => {
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop =
            messagesContainer.value.scrollHeight;
        }
      }, 100);
    };

    // 监听消息变化，自动滚动到底部并控制新消息提示显示
    watch(
      () => props.messages,
      () => {
        if (messagesContainer.value) {
          if (
            messagesContainer.value.scrollHeight -
              messagesContainer.value.scrollTop <
            1000
          ) {
            scrollToBottom();
            newMessageAlert.value = false; // 接近底部时隐藏提示
          } else {
            newMessageAlert.value = true;
          }
        }
      },
      { deep: true }
    );

    // 处理滚动事件，当用户滚动到接近底部时隐藏新消息提示
    const handleScroll = () => {
      if (messagesContainer.value) {
        if (
          messagesContainer.value.scrollHeight -
            messagesContainer.value.scrollTop <
          1000
        ) {
          newMessageAlert.value = false;
        }
      }
    };

    // 组件挂载后滚动到底部并添加滚动事件监听
    onMounted(() => {
      scrollToBottom();
      if (messagesContainer.value) {
        messagesContainer.value.addEventListener("scroll", handleScroll);
      }
    });

    // 组件卸载时移除滚动事件监听
    onUnmounted(() => {
      if (messagesContainer.value) {
        messagesContainer.value.removeEventListener("scroll", handleScroll);
      }
    });

    // 获取显示的用户名（优先使用昵称）
    const getDisplayUsername = (messageOrUser) => {
      let username;

      // 如果是消息对象
      if (typeof messageOrUser === "object" && messageOrUser) {
        username = messageOrUser.username || messageOrUser.userName;
      } else {
        username = messageOrUser;
      }

      // 优先使用昵称
      return props.userInfoMap[username]?.nickname || username || "未知用户";
    };

    // 生成头像颜色
    const getAvatarColor = (username) => {
      // 空值检查，防止访问undefined的length属性
      if (!username) {
        return "#CCCCCC"; // 提供默认颜色
      }

      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7",
        "#DDA0DD",
        "#98D8C8",
        "#F7DC6F",
      ];
      return colors[Math.abs(hash) % colors.length];
    };

    // 获取头像文字
    const getAvatarText = (username) => {
      // 空值检查，防止访问undefined的charAt方法
      if (!username) {
        return "?";
      }
      return username.charAt(0).toUpperCase();
    };

    // 判断用户是否有头像框
    const hasAvatarFrame = (message) => {
      // 如果是当前用户的消息，检查mysteryShopInfo中的hasAvatarFrame
      if (message.userId === props.currentUserId || 
          (!message.userId && message.username === props.currentUsername)) {
        return props.mysteryShopInfo?.hasAvatarFrame || false;
      }
      // 对于其他用户，检查消息对象中是否有hasAvatarFrame属性
      return message.hasAvatarFrame === true;
    };

    // 判断用户是否有SVIP特权
    const hasSvip = (message) => {
      // 如果是当前用户的消息，检查mysteryShopInfo中的hasSvip
      if (message.userId === props.currentUserId || 
          (!message.userId && message.username === props.currentUsername)) {
        return props.mysteryShopInfo?.hasSvip || false;
      }
      // 对于其他用户，检查消息对象中是否有hasSvip属性
      return message.hasSvip === true;
    };

    // 处理消息右键点击事件
    const handleMessageContextMenu = (message) => {
      event.preventDefault();
      emit("messageContextMenu", { event, message });
    };

    // 处理用户头像右键菜单
    const handleUserContextMenu = (user) => {
      event.preventDefault();
      emit("userContextMenu", { event, user });
    };

    // 刷新图片
    const refreshImage = (message) => {
      // 通过更新imageKey来强制重新加载图片
      message.imageKey = `refresh_${Date.now()}_${Math.random()}`;
    };

    // 处理图片加载错误
    const handleImageError = (message) => {
      console.error("图片加载失败:", message.imgUrl);
      // 可以在这里添加更多的错误处理逻辑，比如标记图片为失败状态
      message.loadError = true;
    };

    // 获取完整的图片URL
    const getFullImageUrl = (imgUrl) => {
      if (!imgUrl) return '';
      // 如果已经是完整URL，直接返回
      if (imgUrl.startsWith('http')) {
        return imgUrl;
      }
      // 否则添加服务器地址
      const serverUrl = window.location.origin;
      return `${serverUrl}${imgUrl}`;
    };

    const getClass = (message) => {
      return message.userId === props.currentUserId ? "self" : "other";
    };

    // 格式化时间戳显示
    const formatTime = (timestamp) => {
      if (!timestamp) return "";
      // 如果timestamp已经是格式化过的字符串，直接返回
      if (typeof timestamp === "string" && timestamp.includes(":")) {
        return timestamp;
      }
      // 否则使用dayjs格式化时间戳
      return dayjs(timestamp).format('HH:mm:ss');
    };

    // 获取背景样式
    const getBackgroundStyle = () => {
      if (props.background === 'default') {
        return {};
      }
      return {
        backgroundImage: `url(${props.background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    };

    return {
      messagesContainer,
      getAvatarColor,
      getAvatarText,
      handleMessageContextMenu,
      handleUserContextMenu,
      scrollToBottom,
      getClass,
      getDisplayUsername,
      newMessageAlert,
      formatTime,
      getBackgroundStyle,
      refreshImage,
      handleImageError,
      getFullImageUrl,
      isElectron,
      hasAvatarFrame,
      hasSvip,
    };
  },
};
</script>
<style scoped>
.new-message-alert {
  position: fixed;
  width: 179px;
  bottom: 194px;
  transform: translateX(-10px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 11px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  color: white;
  border-radius: 25px;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  border: none;
  overflow: hidden;
  animation: slideIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  transition: all 0.3s ease;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.new-message-alert:hover {
  transform: translateX(-10px) translateY(-6px) scale(1.05);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);
  background: linear-gradient(135deg, rgba(90, 103, 216, 0.95) 0%, rgba(107, 70, 193, 0.95) 100%);
}

.new-message-alert:active {
  transform: translateX(-10px) translateY(-2px) scale(0.98);
}

.alert-icon {
  width: 24px;
  height: 24px;
  color: white;
  animation: bellRing 1s ease-in-out infinite alternate;
  flex-shrink: 0;
}

@keyframes bellRing {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

.alert-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

@keyframes slideIn {
  from {
    transform: translateX(-10px) translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateX(-10px) translateY(0);
    opacity: 1;
  }
}

/* 确保提示框始终显示在内容上方 */
.chat-messages {
  position: relative;
  height: 100%;
  overflow-y: auto;
}

/* 已撤回消息的样式 */
.recalled-message {
  padding: 8px 12px;
  margin: 4px 0;
  background-color: rgba(0, 0, 0, 0.05);
}

/* 图片错误状态样式 */
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
  height: 200px;
  background-color: var(--background-tertiary);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.error-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.error-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.retry-btn {
  padding: 6px 12px;
  border-radius: 12px;
  max-width: 70%;
  display: inline-block;
  min-width: 180px;
}

.recalled-content {
  display: flex;
  align-items: center;
  color: #999;
  font-size: 14px;
}

.recalled-icon {
  margin-right: 6px;
  font-size: 16px;
}

.recalled-text {
  font-style: italic;
}

/* 图片刷新按钮样式 */
.image-with-refresh {
  position: relative;
  display: inline-block;
}

.image-refresh-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
  background-color: rgba(64, 158, 255, 0.8);
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.image-refresh-btn:hover {
  background-color: rgba(64, 158, 255, 0.9);
  transform: scale(1.1);
}

.image-with-refresh:hover .image-refresh-btn {
  opacity: 1;
}

.refresh-icon {
  color: white;
  width: 14px;
  height: 14px;
}

/* 上传中状态样式 */
.uploading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

.uploading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.uploading-text {
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* 明星样式 */
.star-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.6);
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
.star-avatar-text {
  font-size: 18px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.star-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  background: rgba(255,255,255,0.95);
  color: #ffb400;
  border-radius: 50%;
  padding: 2px 4px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.star-bubble {
  border: 1px solid rgba(255,215,0,0.18);
  box-shadow: 0 6px 30px rgba(255,130,0,0.06);
  border-radius: 14px;
}
.message-item.star .message-time {
  color: #ffb400;
}

/* SVIP小尾巴样式 */
.svip-tail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #9333ea, #a855f7, #c084fc);
  border-radius: 10px;
  position: relative;
  box-shadow: 
    0 0 6px rgba(147, 51, 234, 0.6),
    0 0 12px rgba(147, 51, 234, 0.3);
  animation: svip-tail-glow 2s ease-in-out infinite;
  z-index: 1;
}

/* SVIP消息小尾巴样式 */
.svip-message-tail {
  margin-top: 4px;
  margin-bottom: 2px;
  text-align: right;
  padding-right: 5px;
}

.svip-tail-text {
  display: inline-block;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #9333ea, #a855f7, #c084fc);
  border-radius: 12px;
  position: relative;
  box-shadow: 
    0 0 10px rgba(147, 51, 234, 0.6),
    0 0 20px rgba(147, 51, 234, 0.3),
    inset 0 0 10px rgba(255, 255, 255, 0.2);
  animation: svip-tail-glow 2s ease-in-out infinite;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.5px;
}

/* SVIP小尾巴装饰元素 */
.svip-tail-text::before {
  content: '✨';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  animation: svip-tail-sparkle 1.5s ease-in-out infinite;
}

.svip-tail-text::after {
  content: '✨';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  animation: svip-tail-sparkle 1.5s ease-in-out infinite reverse;
}

/* 暗黑模式下的SVIP小尾巴 */
.theme-dark .svip-tail {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa);
  box-shadow: 
    0 0 8px rgba(124, 58, 237, 0.8),
    0 0 16px rgba(124, 58, 237, 0.4);
}

.theme-dark .svip-tail-text {
  background: linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa);
  box-shadow: 
    0 0 12px rgba(124, 58, 237, 0.8),
    0 0 24px rgba(124, 58, 237, 0.4),
    inset 0 0 10px rgba(255, 255, 255, 0.2);
}

/* SVIP小尾巴动画 */
@keyframes svip-tail-glow {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes svip-tail-sparkle {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scale(1.2);
  }
}
</style>
