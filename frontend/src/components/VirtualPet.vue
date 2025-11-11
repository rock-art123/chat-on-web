<template>
  <div v-if="petEnabled" class="virtual-pet" :style="petStyle" ref="petElement">
    <div class="pet-container" @click="handlePetClick" @mousedown="startDrag">
      <img :src="currentPetImage" :alt="currentPetName" class="pet-image" />
      <div v-if="showMessage" class="pet-bubble" :style="bubbleStyle">
        {{ currentMessage }}
      </div>
      <div v-if="showMentionMessage" class="pet-bubble mention-bubble" :style="mentionMessageStyle" @click.stop="hideMentionMessage">
        {{ mentionMessage }}
      </div>
      <div v-if="showSvipMessage" class="pet-bubble svip-bubble" :style="svipMessageStyle" @click.stop="hideSvipMessage">
        {{ svipMessage }}
      </div>
      <div v-if="showPointsAnimation" class="points-animation">
        +{{ pointsEarned }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { io } from 'socket.io-client';
import pet1Image from '../assets/pats/QQ1.gif';
import pet2Image from '../assets/pats/Q2.gif';
import noticeSound from '../notice.mp3';

// 宠物状态
const petEnabled = ref(false);
const selectedPetStyle = ref(0);
const petPosition = ref({ x: 20, y: 20 }); // 相对于右下角的偏移
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 宠物样式配置
const petStyles = ref([
  { 
    name: '小白', 
    image: pet1Image,
    description: '可爱的小狗'
  },
  { 
    name: '小黄', 
    image: pet2Image,
    description: 'Q版萌宠'
  }
]);

// 宠物问候语
const greetings = ref([
  "主人辛苦了~",
  "主人是不是得去休息一下了~",
  "主人陪我玩一会吧~",
  "主人今天也要加油哦！",
  "主人是最棒的！",
  "主人，来摸摸我吧~",
  "主人，我有点饿了~",
  "主人，我们一起去冒险吧！",
  "主人，你今天看起来真好看！",
  "主人，我好喜欢你呀~",
  "主人，今天过得怎么样？",
  "我是你最忠实的小伙伴！",
  "要不要和我一起玩？",
  "今天也要加油哦！",
  "主人，你真棒！",
  "我好喜欢你呀！",
  "今天天气真好呢！",
  "我们一起去冒险吧！",
  "主人，记得多休息哦！",
  "有你真好！",
  "今天也要开心哦！",
  "我是不是很可爱？",
  "主人，你今天辛苦了！",
  "我们一起成长吧！",
  "今天也要元气满满！",
  "主人，你笑起来真好看！",
  "我好想一直陪着你！",
  "今天也是美好的一天！",
  "主人，记得多喝水哦！",
  "我们一起创造美好回忆吧！",
  "主人，你今天真好看！",
  "我好喜欢和你在一起！",
  "今天也要充满活力！",
  "主人，你是最棒的！",
  "我们一起加油吧！",
  "今天也要保持微笑！",
  "主人，你今天心情好吗？",
  "我好想一直陪着你！",
  "今天也要努力哦！",
  "主人，你今天累不累？",
  "我们一起放松一下吧！",
  "今天也要保持好心情！",
  "主人，你今天吃了什么好吃的？",
  "我好想尝尝看！",
  "今天也要好好照顾自己！",
  "主人，你今天有什么新鲜事吗？",
  "我好想听听看！",
  "今天也要保持好奇心！",
  "主人，你今天学到了什么新东西吗？",
  "我好想学习一下！",
  "今天也要保持学习的热情！",
  "主人，你今天有什么计划吗？",
  "我好想参与一下！",
  "今天也要充实自己！",
  "主人，你今天遇到了什么有趣的人吗？",
  "我好想认识一下！",
  "今天也要保持社交的热情！",
  "主人，你今天看到了什么美丽的风景吗？",
  "我好想欣赏一下！",
  "今天也要保持欣赏美的眼睛！",
  "主人，你今天听到了什么好听的音乐吗？",
  "我好想听一下！",
  "今天也要保持欣赏音乐的心情！",
  "主人，你今天读到了什么有趣的书吗？",
  "我好想读一下！",
  "今天也要保持阅读的习惯！",
  "主人，你今天吃到了什么美味的食物吗？",
  "我好想尝一下！",
  "今天也要保持品尝美食的乐趣！",
  "主人，你今天看到了什么可爱的动物吗？",
  "我好想摸一下！",
  "今天也要保持对动物的喜爱！",
  "主人，你今天闻到了什么好闻的香味吗？",
  "我好想闻一下！",
  "今天也要保持对香味的敏感！",
  "主人，你今天感受到了什么温暖的阳光吗？",
  "我好想晒一下！",
  "今天也要保持对阳光的喜爱！",
  "主人，你今天感受到了什么清凉的微风吗？",
  "我好想吹一下！",
  "今天也要保持对微风的喜爱！",
  "主人，你今天感受到了什么柔软的草地吗？",
  "我好想躺一下！",
  "今天也要保持对草地的喜爱！",
  "主人，你今天感受到了什么清凉的水流吗？",
  "我好想玩一下！",
  "今天也要保持对水的喜爱！",
  "主人，你今天感受到了什么温暖的拥抱吗？",
  "我好想抱一下！",
  "今天也要保持对拥抱的喜爱！",
  "主人，你今天感受到了什么甜蜜的亲吻吗？",
  "我好想亲一下！",
  "今天也要保持对亲吻的喜爱！",
  "主人，你今天感受到了什么温柔的抚摸吗？",
  "我好想摸一下！",
  "今天也要保持对抚摸的喜爱！",
  "主人，你今天感受到了什么轻柔的按摩吗？",
  "我好想按一下！",
  "今天也要保持对按摩的喜爱！",
  "主人，你今天感受到了什么舒适的休息吗？",
  "我好想睡一下！",
  "今天也要保持对休息的喜爱！",
  "主人，你今天感受到了什么美味的食物吗？",
  "我好想尝一下！",
  "今天也要保持对食物的喜爱！",
  "主人，你今天感受到了什么清新的空气吗？",
  "我好想吸一下！",
  "今天也要保持对空气的喜爱！",
  "主人，你今天感受到了什么美丽的花朵吗？",
  "我好想闻一下！",
  "今天也要保持对花朵的喜爱！",
  "主人，你今天感受到了什么可爱的星星吗？",
  "我好想看一下！",
  "今天也要保持对星星的喜爱！",
  "主人，你今天感受到了什么明亮的月亮吗？",
  "我好想照一下！",
  "今天也要保持对月亮的喜爱！",
  "主人，你今天感受到了什么闪烁的灯光吗？",
  "我好想亮一下！",
  "今天也要保持对灯光的喜爱！",
  "主人，你今天感受到了什么绚丽的彩虹吗？",
  "我好想画一下！",
  "今天也要保持对彩虹的喜爱！",
  "主人，你今天感受到了什么美丽的烟花吗？",
  "我好想放一下！",
  "今天也要保持对烟花的喜爱！",
  "主人，你今天感受到了什么美味的蛋糕吗？",
  "我好想尝一下！",
  "今天也要保持对蛋糕的喜爱！",
  "主人，你今天感受到了什么甜美的糖果吗？",
  "我好想吃一下！",
  "今天也要保持对糖果的喜爱！",
  "主人，你今天感受到了什么清凉的冰淇淋吗？",
  "我好想舔一下！",
  "今天也要保持对冰淇淋的喜爱！",
  "主人，你今天感受到了什么香浓的咖啡吗？",
  "我好想喝一下！",
  "今天也要保持对咖啡的喜爱！",
  "主人，你今天感受到了什么清香的茶水吗？",
  "我好想品一下！",
  "今天也要保持对茶水的喜爱！",
  "主人，你今天感受到了什么甜美的果汁吗？",
  "我好想饮一下！",
  "今天也要保持对果汁的喜爱！",
  "主人，你今天感受到了什么清爽的汽水吗？",
  "我好想喝一下！",
  "今天也要保持对汽水的喜爱！",
  "主人，你今天感受到了什么香浓的牛奶吗？",
  "我好想尝一下！",
  "今天也要保持对牛奶的喜爱！",
  "主人，你今天感受到了什么美味的巧克力吗？",
  "我好想咬一下！",
  "今天也要保持对巧克力的喜爱！",
  "主人，你今天感受到了什么香脆的饼干吗？",
  "我好想啃一下！",
  "今天也要保持对饼干的喜爱！",
  "主人，你今天感受到了什么柔软的面包吗？",
  "我好想撕一下！",
  "今天也要保持对面包的喜爱！",
  "主人，你今天感受到了什么美味的披萨吗？",
  "我好想尝一下！",
  "今天也要保持对披萨的喜爱！",
  "主人，你今天感受到了什么香辣的汉堡吗？",
  "我好想咬一下！",
  "今天也要保持对汉堡的喜爱！",
  "主人，你今天感受到了什么美味的炸鸡吗？",
  "我好想啃一下！",
  "今天也要保持对炸鸡的喜爱！",
  "主人，你今天感受到了什么香浓的薯条吗？",
  "我好想蘸一下！",
  "今天也要保持对薯条的喜爱！",
  "主人，你今天感受到了什么美味的甜甜圈吗？",
  "我好想咬一下！",
  "今天也要保持对甜甜圈的喜爱！",
  "主人，你今天感受到了什么美味的冰淇淋吗？",
  "我好想舔一下！",
  "今天也要保持对冰淇淋的喜爱！",
  "主人，你今天感受到了什么美味的布丁吗？",
  "我好想尝一下！",
  "今天也要保持对布丁的喜爱！",
  "主人，你今天感受到了什么美味的果冻吗？",
  "我好想吸一下！",
  "今天也要保持对果冻的喜爱！",
  "主人，你今天感受到了什么美味的酸奶吗？",
  "我好想喝一下！",
  "今天也要保持对酸奶的喜爱！",
  "主人，你今天感受到了什么美味的奶酪吗？",
  "我好想尝一下！",
  "今天也要保持对奶酪的喜爱！",
  "主人，你今天感受到了什么美味的奶油吗？",
  "我好想舔一下！",
  "今天也要保持对奶油的喜爱！",
  "主人，你今天感受到了什么美味的黄油吗？",
  "我好想抹一下！",
  "今天也要保持对黄油的喜爱！",
  "主人，你今天感受到了什么美味的果酱吗？",
  "我好想涂一下！",
  "今天也要保持对果酱的喜爱！",
  "主人，你今天感受到了什么美味的蜂蜜吗？",
  "我好想蘸一下！",
  "今天也要保持对蜂蜜的喜爱！",
  "主人，你今天感受到了什么美味的糖浆吗？",
  "我好想淋一下！",
  "今天也要保持对糖浆的喜爱！",
  "主人，你今天感受到了什么美味的巧克力酱吗？",
  "我好想抹一下！",
  "今天也要保持对巧克力酱的喜爱！",
  "主人，你今天感受到了什么美味的花生酱吗？",
  "我好想涂一下！",
  "今天也要保持对花生酱的喜爱！",
  "主人，你今天感受到了什么美味的草莓酱吗？",
  "我好想蘸一下！",
  "今天也要保持对草莓酱的喜爱！",
  "主人，你今天感受到了什么美味的蓝莓酱吗？",
  "我好想涂一下！",
  "今天也要保持对蓝莓酱的喜爱！",
  "主人，你今天感受到了什么美味的苹果酱吗？",
  "我好想抹一下！",
  "今天也要保持对苹果酱的喜爱！",
  "主人，你今天感受到了什么美味的橙子酱吗？",
  "我好想蘸一下！",
  "今天也要保持对橙子酱的喜爱！",
  "主人，你今天感受到了什么美味的柠檬酱吗？",
  "我好想涂一下！",
  "今天也要保持对柠檬酱的喜爱！",
  "主人，你今天感受到了什么美味的葡萄酱吗？",
  "我好想抹一下！",
  "今天也要保持对葡萄酱的喜爱！",
  "主人，你今天感受到了什么美味的樱桃酱吗？",
  "我好想蘸一下！",
  "今天也要保持对樱桃酱的喜爱！",
  "主人，你今天感受到了什么美味的桃子酱吗？",
  "我好想涂一下！",
  "今天也要保持对桃子酱的喜爱！",
  "主人，你今天感受到了什么美味的梨子酱吗？",
  "我好想抹一下！",
  "今天也要保持对梨子酱的喜爱！",
  "主人，你今天感受到了什么美味的香蕉酱吗？",
  "我好想蘸一下！",
  "今天也要保持对香蕉酱的喜爱！",
  "主人，你今天感受到了什么美味的菠萝酱吗？",
  "我好想涂一下！",
  "今天也要保持对菠萝酱的喜爱！",
  "主人，你今天感受到了什么美味的芒果酱吗？",
  "我好想抹一下！",
  "今天也要保持对芒果酱的喜爱！",
  "主人，你今天感受到了什么美味的猕猴桃酱吗？",
  "我好想蘸一下！",
  "今天也要保持对猕猴桃酱的喜爱！",
  "主人，你今天感受到了什么美味的草莓果酱吗？",
  "我好想涂一下！",
  "今天也要保持对草莓果酱的喜爱！",
  "主人，你今天感受到了什么美味的蓝莓果酱吗？",
  "我好想抹一下！",
  "今天也要保持对蓝莓果酱的喜爱！",
  "主人，你今天感受到了什么美味的苹果果酱吗？",
  "我好想蘸一下！",
  "今天也要保持对苹果果酱的喜爱！",
  "主人，你今天感受到了什么美味的橙子果酱吗？",
  "我好想涂一下！",
  "今天也要保持对橙子果酱的喜爱！",
  "主人，你今天感受到了什么美味的柠檬果酱吗？",
  "我好想抹一下！",
  "今天也要保持对柠檬果酱的喜爱！",
  "主人，你今天感受到了什么美味的葡萄果酱吗？",
  "我好想蘸一下！",
  "今天也要保持对葡萄果酱的喜爱！",
  "主人，你今天感受到了什么美味的樱桃果酱吗？",
  "我好想涂一下！",
  "今天也要保持对樱桃果酱的喜爱！",
  "主人，你今天感受到了什么美味的桃子果酱吗？",
  "我好想抹一下！",
  "今天也要保持对桃子果酱的喜爱！",
  "主人，你今天感受到了什么美味的梨子果酱吗？",
  "我好想蘸一下！",
  "今天也要保持对梨子果酱的喜爱！",
  "主人，你今天感受到了什么美味的香蕉果酱吗？",
  "我好想涂一下！",
  "今天也要保持对香蕉果酱的喜爱！",
  "主人，你今天感受到了什么美味的菠萝果酱吗？",
  "我好想抹一下！",
  "今天也要保持对菠萝果酱的喜爱！",
  "主人，你今天感受到了什么美味的芒果果酱吗？",
  "我好想蘸一下！",
  "今天也要保持对芒果果酱的喜爱！",
  "主人，你今天感受到了什么美味的猕猴桃果酱吗？",
  "我好想涂一下！",
  "今天也要保持对猕猴桃果酱的喜爱！"
]);

// 消息和积分相关
const showMessage = ref(false);
const currentMessage = ref('');
const bubbleStyle = ref({});
const showPointsAnimation = ref(false);
const pointsEarned = ref(0);

// 被提及相关
const showMentionMessage = ref(false);
const mentionMessage = ref('');
const mentionMessageStyle = ref({});
let mentionTimeout = null;
let lastNoticeTime = 0; // 记录上次播放通知音的时间

// SVIP消息相关
const showSvipMessage = ref(false);
const svipMessage = ref('');
const svipMessageStyle = ref({});
let svipTimeout = null;

// 每日积分赠送限制
const dailyPointsCount = ref(0);
const maxDailyPoints = 10;
const lastPointsDate = ref('');

// DOM元素引用
const petElement = ref(null);

// 计算属性
const currentPetImage = computed(() => {
  return petStyles.value[selectedPetStyle.value]?.image || '';
});

const currentPetName = computed(() => {
  return petStyles.value[selectedPetStyle.value]?.name || '';
});

const petStyle = computed(() => {
  return {
    right: `${petPosition.value.x}px`,
    bottom: `${petPosition.value.y}px`
  };
});

// 初始化宠物设置
function initPetSettings() {
  console.log('VirtualPet: 初始化宠物设置');
  // 从localStorage获取宠物设置
  const storedPetEnabled = localStorage.getItem('petEnabled');
  console.log('VirtualPet: storedPetEnabled', storedPetEnabled);
  if (storedPetEnabled !== null) {
    petEnabled.value = storedPetEnabled === 'true';
  } else {
    // 如果没有设置过，默认启用宠物
    petEnabled.value = true;
    localStorage.setItem('petEnabled', 'true');
    console.log('VirtualPet: 默认启用宠物');
  }
  console.log('VirtualPet: petEnabled.value', petEnabled.value);
  
  const storedPetStyle = localStorage.getItem('selectedPetStyle');
  if (storedPetStyle !== null) {
    selectedPetStyle.value = parseInt(storedPetStyle, 10);
  }
  
  const storedPosition = localStorage.getItem('petPosition');
  if (storedPosition) {
    try {
      petPosition.value = JSON.parse(storedPosition);
    } catch (e) {
      console.error('Failed to parse pet position:', e);
    }
  }
  
  // 检查每日积分赠送限制
  checkDailyPointsLimit();
}

// 检查每日积分赠送限制
function checkDailyPointsLimit() {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('petLastPointsDate');
  
  if (storedDate !== today) {
    // 新的一天，重置积分赠送次数
    dailyPointsCount.value = 0;
    lastPointsDate.value = today;
    localStorage.setItem('petLastPointsDate', today);
    localStorage.setItem('petDailyPointsCount', '0');
  } else {
    // 同一天，获取已赠送积分次数
    const storedCount = localStorage.getItem('petDailyPointsCount');
    if (storedCount !== null) {
      dailyPointsCount.value = parseInt(storedCount, 10);
    }
  }
}

// 隐藏被提及的气泡消息
function hideMentionMessage() {
  showMentionMessage.value = false;
  if (mentionTimeout) {
    clearTimeout(mentionTimeout);
    mentionTimeout = null;
  }
}

// 隐藏SVIP消息的气泡
function hideSvipMessage() {
  showSvipMessage.value = false;
  if (svipTimeout) {
    clearTimeout(svipTimeout);
    svipTimeout = null;
  }
}

// 显示被提及的气泡消息
function showMentionBubble(username, content) {
  console.log('VirtualPet: showMentionBubble被调用，username =', username, 'content =', content);
  console.log('VirtualPet: petEnabled.value =', petEnabled.value);
  
  if (!petEnabled.value) {
    console.log('VirtualPet: 宠物未启用，不显示提及气泡');
    return;
  }
  
  // 清除之前的定时器
  if (mentionTimeout) {
    clearTimeout(mentionTimeout);
  }
  
  // 设置被提及的消息，包含具体消息内容
  mentionMessage.value = `主人，${username}对你说：${content}`;
  showMentionMessage.value = true;
  console.log('VirtualPet: showMentionMessage设置为true');
  
  // 计算气泡位置（避免超出屏幕）
  setTimeout(() => {
    if (petElement.value) {
      const petRect = petElement.value.getBoundingClientRect();
      const bubbleWidth = 220; // 预估气泡宽度，比普通气泡稍宽
      const bubbleHeight = 60; // 预估气泡高度
      
      let left = -bubbleWidth / 2 + 40; // 默认居中偏左
      let bottom = 100; // 默认在宠物上方
      
      // 如果气泡会超出左边界
      if (petRect.left + left < 10) {
        left = 10 - petRect.left;
      }
      
      // 如果气泡会超出右边界
      if (petRect.right + left > window.innerWidth - 10) {
        left = window.innerWidth - 10 - petRect.right;
      }
      
      mentionMessageStyle.value = {
        left: `${left}px`,
        bottom: `${bottom}px`
      };
      console.log('VirtualPet: 气泡位置设置完成', mentionMessageStyle.value);
    }
  }, 10);
  
  // 播放通知音（5秒内只播放一次）
  const currentTime = Date.now();
  if (currentTime - lastNoticeTime > 5000) {
    const audio = new Audio(noticeSound);
    audio.play().catch(error => {
      console.error('播放通知音失败:', error);
    });
    lastNoticeTime = currentTime;
    console.log('VirtualPet: 播放通知音');
  }
  
  // 10秒后自动隐藏气泡
  mentionTimeout = setTimeout(() => {
    showMentionMessage.value = false;
    console.log('VirtualPet: 气泡自动隐藏');
  }, 10000);
}

// 显示SVIP消息的气泡（不播放提示音）
function showSvipMessageBubble(username, content) {
  console.log('VirtualPet: showSvipMessageBubble被调用，username =', username, 'content =', content);
  console.log('VirtualPet: petEnabled.value =', petEnabled.value);
  
  if (!petEnabled.value) {
    console.log('VirtualPet: 宠物未启用，不显示SVIP消息气泡');
    return;
  }
  
  // 清除之前的定时器
  if (svipTimeout) {
    clearTimeout(svipTimeout);
  }
  
  // 设置SVIP消息，包含具体消息内容
  svipMessage.value = `尊贵的SVIP用户${username}说：${content}`;
  showSvipMessage.value = true;
  console.log('VirtualPet: showSvipMessage设置为true');
  
  // 计算气泡位置（避免超出屏幕）
  setTimeout(() => {
    if (petElement.value) {
      const petRect = petElement.value.getBoundingClientRect();
      const bubbleWidth = 240; // 预估气泡宽度，比普通气泡稍宽
      const bubbleHeight = 60; // 预估气泡高度
      
      let left = -bubbleWidth / 2 + 40; // 默认居中偏左
      let bottom = 120; // 默认在宠物上方，比提及气泡稍高
      
      // 如果气泡会超出左边界
      if (petRect.left + left < 10) {
        left = 10 - petRect.left;
      }
      
      // 如果气泡会超出右边界
      if (petRect.right + left > window.innerWidth - 10) {
        left = window.innerWidth - 10 - petRect.right;
      }
      
      svipMessageStyle.value = {
        left: `${left}px`,
        bottom: `${bottom}px`
      };
      console.log('VirtualPet: SVIP气泡位置设置完成', svipMessageStyle.value);
    }
  }, 10);
  
  // 不播放提示音，只显示气泡
  
  // 8秒后自动隐藏气泡
  svipTimeout = setTimeout(() => {
    showSvipMessage.value = false;
    console.log('VirtualPet: SVIP气泡自动隐藏');
  }, 8000);
}

// 处理宠物点击
function handlePetClick() {
  if (isDragging.value) return;
  
  // 显示随机问候语
  const randomIndex = Math.floor(Math.random() * greetings.value.length);
  currentMessage.value = greetings.value[randomIndex];
  showMessage.value = true;
  
  // 计算气泡位置（避免超出屏幕）
  setTimeout(() => {
    if (petElement.value) {
      const petRect = petElement.value.getBoundingClientRect();
      const bubbleWidth = 200; // 预估气泡宽度
      const bubbleHeight = 60; // 预估气泡高度
      
      let left = -bubbleWidth / 2 + 40; // 默认居中偏左
      let bottom = 100; // 默认在宠物上方
      
      // 如果气泡会超出左边界
      if (petRect.left + left < 10) {
        left = 10 - petRect.left;
      }
      
      // 如果气泡会超出右边界
      if (petRect.right + left > window.innerWidth - 10) {
        left = window.innerWidth - 10 - petRect.right;
      }
      
      bubbleStyle.value = {
        left: `${left}px`,
        bottom: `${bottom}px`
      };
    }
  }, 10);
  
  // 检查是否可以赠送积分
  if (dailyPointsCount.value < maxDailyPoints) {
    // 添加概率判断，降低积分获得概率
    const probability = Math.random(); // 0-1之间的随机数
    
    if (probability < 0.3) { // 30%的概率获得积分
      // 随机赠送积分(50-100)
      const points = Math.floor(Math.random() * 51) + 50;
      pointsEarned.value = points;
      showPointsAnimation.value = true;
      
      // 更新积分（通过socket发送到服务器）
      if (window.socket && window.socket.connected) {
        window.socket.emit('pet_interaction_points', { points });
      }
      
      // 更新每日积分次数
      dailyPointsCount.value++;
      localStorage.setItem('petDailyPointsCount', dailyPointsCount.value.toString());
    }
  }
  
  // 3秒后隐藏消息和积分动画
  setTimeout(() => {
    showMessage.value = false;
    showPointsAnimation.value = false;
  }, 3000);
}

// 开始拖动
function startDrag(event) {
  if (event.button !== 0) return; // 只响应左键
  
  isDragging.value = true;
  
  const petRect = petElement.value.getBoundingClientRect();
  dragOffset.value.x = event.clientX - petRect.left;
  dragOffset.value.y = event.clientY - petRect.top;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  
  event.preventDefault();
}

// 拖动中
function onDrag(event) {
  if (!isDragging.value) return;
  
  const x = event.clientX - dragOffset.value.x;
  const y = event.clientY - dragOffset.value.y;
  
  // 计算相对于右下角的偏移
  const right = window.innerWidth - x - 80; // 80是宠物宽度
  const bottom = window.innerHeight - y - 80; // 80是宠物高度
  
  // 限制在屏幕范围内
  petPosition.value.x = Math.max(0, Math.min(right, window.innerWidth - 100));
  petPosition.value.y = Math.max(0, Math.min(bottom, window.innerHeight - 100));
  
  // 保存位置到localStorage
  localStorage.setItem('petPosition', JSON.stringify(petPosition.value));
}

// 停止拖动
function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 监听宠物开关变化
function handlePetToggle(event) {
  petEnabled.value = event.detail.enabled;
}

// 监听宠物样式变化
function handlePetStyleChange(event) {
  selectedPetStyle.value = event.detail.styleIndex;
}

// 监听被提及事件
const handleUserMentioned = (event) => {
  console.log('VirtualPet: 收到user_mentioned事件', event.detail);
  console.log('VirtualPet: petEnabled.value =', petEnabled.value);
  const { username, content } = event.detail;
  showMentionBubble(username, content);
};

// 监听SVIP消息事件
const handleSvipMessage = (event) => {
  console.log('VirtualPet: 收到svip_message事件', event.detail);
  console.log('VirtualPet: petEnabled.value =', petEnabled.value);
  const { username, content } = event.detail;
  showSvipMessageBubble(username, content);
};

// 组件挂载时
onMounted(() => {
  initPetSettings();
  
  // 监听全局事件
  window.addEventListener('petToggle', handlePetToggle);
  window.addEventListener('petStyleChange', handlePetStyleChange);
  window.addEventListener('user_mentioned', handleUserMentioned);
  window.addEventListener('svip_message', handleSvipMessage);
  
  // 确保socket连接可用
  if (!window.socket) {
    window.socket = io();
  }
  
  // 监听积分更新
  window.socket.on('points_updated', (data) => {
    // 可以在这里处理积分更新逻辑
    console.log('宠物互动积分更新:', data);
  });
  
  // 监听宠物互动积分成功事件
  window.socket.on('pet_interaction_points_success', (data) => {
    console.log('宠物互动积分添加成功:', data);
    // 可以在这里添加成功提示或其他UI反馈
  });
  
  // 监听宠物互动积分失败事件
  window.socket.on('pet_interaction_points_failed', (data) => {
    console.error('宠物互动积分添加失败:', data.message);
    // 可以在这里添加错误提示
  });
});

// 组件卸载时
onUnmounted(() => {
  // 移除事件监听
  window.removeEventListener('petToggle', handlePetToggle);
  window.removeEventListener('petStyleChange', handlePetStyleChange);
  window.removeEventListener('user_mentioned', handleUserMentioned);
  window.removeEventListener('svip_message', handleSvipMessage);
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  
  // 清除定时器
  if (mentionTimeout) {
    clearTimeout(mentionTimeout);
  }
  if (svipTimeout) {
    clearTimeout(svipTimeout);
  }
  
  // 移除socket事件监听
  if (window.socket) {
    window.socket.off('points_updated');
    window.socket.off('pet_interaction_points_success');
    window.socket.off('pet_interaction_points_failed');
  }
});
</script>

<style scoped>
.virtual-pet {
  position: fixed;
  width: 80px;
  height: 80px;
  z-index: 1000;
  cursor: pointer;
  user-select: none;
  transition: none;
}

.pet-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.pet-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transition: transform 0.3s ease;
}

.pet-container:hover .pet-image {
  transform: scale(1.1);
}

.pet-bubble {
  position: absolute;
  background: white;
  border-radius: 20px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #333;
  max-width: 200px;
  word-wrap: break-word;
  z-index: 1001;
  animation: bubble-appear 0.3s ease;
}

.mention-bubble {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  cursor: pointer;
  max-width: 220px;
}

.svip-bubble {
  background: linear-gradient(135deg, #9333ea, #a855f7, #c084fc);
  color: #fff;
  border: 1px solid rgba(147, 51, 234, 0.3);
  cursor: pointer;
  max-width: 240px;
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.svip-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: svip-bubble-shine 3s infinite;
}

@keyframes svip-bubble-shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.pet-bubble::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 10px 10px 0;
  border-style: solid;
  border-color: white transparent transparent;
}

.points-animation {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ff9800, #ffc107);
  color: white;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
  z-index: 1002;
  animation: points-float-up 2s ease-out forwards;
}

@keyframes bubble-appear {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes points-float-up {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-40px);
  }
}
</style>