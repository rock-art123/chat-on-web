<template>
  <div class="setting-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <el-icon><SettingIcon /></el-icon>
        应用设置
      </h1>
      <p class="page-subtitle">管理您的应用偏好设置</p>
      <div class="version-info" @click="handleVersionClick" title="连续点击10次激活管理员模式">
        <span class="version-label">版本：</span>
        <span class="version-number">{{ appVersion }}</span>
      </div>
    </div>

    <!-- 设置卡片网格 -->
    <div class="settings-grid">
      <!-- 音乐源设置卡片 -->
      <el-card class="setting-card music-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><MusicIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>音乐源设置</h3>
              <p>配置音乐播放服务</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditing" 
                type="primary" 
                @click="startEditing" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveMusicSettings" 
                  :loading="musicSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditing" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前音乐源信息 -->
          <div v-if="!isEditing" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><MusicIcon /></el-icon>
                <span>当前音乐源</span>
              </div>
              <div class="info-value">{{ currentMusicSourceName }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><LinkIcon /></el-icon>
                <span>音乐源URL</span>
              </div>
              <div class="info-value url-value">{{ musicSettings.musicSource }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="musicForm"
            :model="tempMusicSettings"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="选择音乐源"
              prop="musicSource"
              :rules="[{ required: true, message: '请选择音乐源', trigger: 'change' }]"
            >
              <el-select 
                v-model="tempMusicSettings.musicSource" 
                placeholder="请选择音乐源" 
                class="w-full"
              >
                <el-option 
                  v-for="source in musicSources"
                  :key="source.name"
                  :label="source.name"
                  :value="source.url"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      
      
      <!-- Core ID设置卡片 - 仅在客户端模式下显示 -->
      <el-card v-if="isElectron()" class="setting-card core-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><KeyIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>客户端ID设置</h3>
              <p>配置客户端身份标识</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditingCore" 
                type="primary" 
                @click="startEditingCore" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveCoreSettings" 
                  :loading="coreSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditingCore" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前Core ID -->
          <div v-if="!isEditingCore" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><KeyIcon /></el-icon>
                <span>当前客户端ID</span>
              </div>
              <div class="info-value">{{ coreSettings.coreId || '未设置' }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><CoinIcon /></el-icon>
                <span>当前积分</span>
              </div>
              <div class="info-value">{{ coreSettings.points || 0 }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="coreForm"
            :model="tempCoreSettings"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="客户端ID"
              prop="coreId"
              :rules="[{ required: true, message: '请输入客户端ID', trigger: 'blur' }]"
            >
              <el-input 
                v-model="tempCoreSettings.coreId" 
                placeholder="请输入客户端ID" 
                class="w-full"
              />
            </el-form-item>
            
            <el-form-item 
              label="积分设置"
              prop="pointsValue"
            >
              <div class="points-control">
                <el-input-number 
                  v-model="tempCoreSettings.pointsValue" 
                  :min="0" 
                  :max="999999"
                  placeholder="输入积分数量" 
                  class="points-input"
                />
              </div>
            </el-form-item>
            
            <el-form-item v-if="tempCoreSettings.pointsValue > 0">
              <div class="points-preview">
                <span>当前积分: {{ coreSettings.points || 0 }}</span>
                <span>→ 修改后: {{ tempCoreSettings.pointsValue || 0 }}</span>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      

      
      <!-- AI设置卡片 -->
      <el-card class="setting-card ai-card" shadow="hover" v-if="adminSettings.adminMode">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><CpuIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>AI配置</h3>
              <p>配置AI增强功能</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditingAi" 
                type="primary" 
                @click="startEditingAi" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveAiConfig" 
                  :loading="aiSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditingAi" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前AI配置 -->
          <div v-if="!isEditingAi" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><CpuIcon /></el-icon>
                <span>AI模型</span>
              </div>
              <div class="info-value">{{ aiConfig.model || '未设置' }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><InfoIcon /></el-icon>
                <span>增强搜索</span>
              </div>
              <div class="info-value">{{ aiConfig.enable_enhancement ? '已启用' : '未启用' }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><InfoIcon /></el-icon>
                <span>AI身份描述</span>
              </div>
              <div class="info-value">{{ aiConfig.systemPrompt || '未设置' }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><InfoIcon /></el-icon>
                <span>多样性阈值</span>
              </div>
              <div class="info-value">{{ aiConfig.temperature || 0.8 }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="aiConfigForm"
            :model="tempAiConfig"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="AI模型"
              prop="model"
              :rules="[{ required: true, message: '请选择AI模型', trigger: 'change' }]"
            >
              <el-select 
                v-model="tempAiConfig.model" 
                placeholder="请选择AI模型" 
                class="w-full"
              >
                <el-option-group
                  v-for="group in availableModelOptions"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="item in group.options"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  >
                    <div class="model-option">
                      <div class="model-label">{{ item.label }}</div>
                      <div class="model-description" v-html="item.description"></div>
                    </div>
                  </el-option>
                </el-option-group>
              </el-select>
            </el-form-item>
            
            <el-form-item label="增强搜索">
              <el-switch v-model="tempAiConfig.enable_enhancement" />
            </el-form-item>
            
            <el-form-item 
              label="AI身份描述"
              prop="systemPrompt"
              :rules="[
                { required: true, message: '请输入AI身份描述', trigger: 'blur' },
                { min: 20, message: 'AI身份描述至少需要20个字符', trigger: 'blur' }
              ]"
            >
              <el-input 
                v-model="tempAiConfig.systemPrompt" 
                type="textarea" 
                :rows="4"
                placeholder="请输入AI身份描述，至少20个字符" 
                class="w-full"
              />
            </el-form-item>
            
            <el-form-item 
              label="多样性阈值"
              prop="temperature"
            >
              <el-slider 
                v-model="tempAiConfig.temperature" 
                :min="0" 
                :max="2" 
                :step="0.1"
                show-input
                :show-input-controls="false"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      
      <!-- 抽奖概率设置卡片 -->
      <el-card class="setting-card mystery-shop-card" shadow="hover" v-if="isElectron() && adminSettings.adminMode">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><PresentIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>抽奖概率设置</h3>
              <p>设置神秘商店抽奖概率阈值</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditingMysteryShop" 
                type="primary" 
                @click="startEditingMysteryShop" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveMysteryShopSettings" 
                  :loading="mysteryShopSaving"
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditingMysteryShop" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前抽奖概率设置 -->
          <div v-if="!isEditingMysteryShop" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><PresentIcon /></el-icon>
                <span>抽奖概率阈值</span>
              </div>
              <div class="info-value">{{ mysteryShopSettings.probability }}%</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><InfoIcon /></el-icon>
                <span>中奖概率</span>
              </div>
              <div class="info-value">{{ mysteryShopSettings.probability }}%</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><InfoIcon /></el-icon>
                <span>说明</span>
              </div>
              <div class="info-value">随机数小于此值时中奖</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            ref="mysteryShopForm"
            :model="tempMysteryShopSettings"
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item 
              label="抽奖概率阈值 (%)"
              prop="probability"
              :rules="[
                { required: true, message: '请输入抽奖概率阈值', trigger: 'blur' },
                { type: 'number', min: 1, max: 100, message: '抽奖概率阈值必须在1-100之间', trigger: 'blur' }
              ]"
            >
              <el-input-number 
                v-model="tempMysteryShopSettings.probability" 
                :min="1" 
                :max="100"
                :step="1"
                controls-position="right"
                class="w-full"
              />
              <div class="form-help-text">
                设置抽奖概率阈值，随机数小于此值时中奖。例如：35表示35%的中奖概率。
              </div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
      
      <!-- 动画和提示音设置卡片 -->
      <el-card class="setting-card animation-sound-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <div class="header-icon">
              <el-icon><BellIcon /></el-icon>
            </div>
            <div class="header-content">
              <h3>动画和提示音设置</h3>
              <p>控制出场动画和消息提示音</p>
            </div>
            <div class="header-actions">
              <el-button 
                v-if="!isEditingAnimationSound" 
                type="primary" 
                @click="startEditingAnimationSound" 
                class="edit-btn"
                size="small"
              >
                <el-icon><EditIcon /></el-icon>
                编辑
              </el-button>
              <div v-else class="edit-actions">
                <el-button 
                  type="success" 
                  @click="saveAnimationSoundSettings" 
                  size="small"
                >
                  <el-icon><CheckIcon /></el-icon>
                  保存
                </el-button>
                <el-button @click="cancelEditingAnimationSound" size="small">
                  <el-icon><CloseIcon /></el-icon>
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
        
        <div class="card-content">
          <!-- 只读模式：显示当前动画和提示音设置 -->
          <div v-if="!isEditingAnimationSound" class="info-display">
            <div class="info-item">
              <div class="info-label">
                <el-icon><FilmIcon /></el-icon>
                <span>出场动画</span>
              </div>
              <div class="info-value">{{ animationSoundSettings.enableEntranceAnimation ? '已启用' : '已禁用' }}</div>
            </div>
            
            <div class="info-item">
              <div class="info-label">
                <el-icon><BellIcon /></el-icon>
                <span>消息提示音</span>
              </div>
              <div class="info-value">{{ animationSoundSettings.enableNotificationSound ? '已启用' : '已禁用' }}</div>
            </div>
          </div>
          
          <!-- 编辑模式：显示表单 -->
          <el-form 
            v-else
            label-position="top"
            class="compact-form"
            size="default"
          >
            <el-form-item label="出场动画">
              <el-switch 
                v-model="tempAnimationSoundSettings.enableEntranceAnimation"
                active-text="启用"
                inactive-text="禁用"
              />
              <div class="form-item-description">控制用户进入聊天室时的动画效果</div>
            </el-form-item>
            
            <el-form-item label="消息提示音">
              <el-switch 
                v-model="tempAnimationSoundSettings.enableNotificationSound"
                active-text="启用"
                inactive-text="禁用"
              />
              <div class="form-item-description">控制接收新消息时的提示音效</div>
            </el-form-item>
          </el-form>
        </div>
      </el-card>

            <!-- 管理员状态卡片 -->
      <el-card v-if="adminSettings.adminMode" class="settings-card admin-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon class="header-icon admin-header-icon"><UserIcon /></el-icon>
              <span class="card-title">管理员模式</span>
            </div>
          </div>
        </template>
        <div class="card-content">
          <div class="admin-status-content">
            <div class="admin-status-info">
              <el-icon class="admin-status-icon"><UserIcon /></el-icon>
              <span class="admin-status-text">管理员模式已启用</span>
            </div>
            <div class="admin-actions">
              <el-button 
                type="danger" 
                size="default"
                @click="disableAdminMode"
                class="admin-close-btn"
              >
                <el-icon><CloseIcon /></el-icon>
                关闭管理员模式
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { isElectron } from "../utils/electronUtils.js";

// 获取用户ID的函数
const getUserId = () => {
  // 优先尝试获取userId
  let userId = localStorage.getItem("userId");
  
  // 如果没有userId，尝试使用coreId作为备用
  if (!userId) {
    userId = localStorage.getItem("coreId");
  }
  
  // 如果仍然没有ID，生成一个临时的ID
  if (!userId) {
    userId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
  }
  
  return userId;
};

// 从element-plus导入所有需要的图标
import { 
  Setting as SettingIcon,
  VideoPlay as MusicIcon,
  User as UserIcon,
  InfoFilled as InfoIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Key as KeyIcon,
  Cpu as CpuIcon,
  Coin as CoinIcon,
  Bell as BellIcon,
  Film as FilmIcon,
  Monitor as MonitorIcon,
  List as ListIcon,
  Delete as DeleteIcon,
  Plus as PlusIcon,
  Present as GiftIcon
} from '@element-plus/icons-vue';

export default {
  name: 'Setting',
  components: {
    SettingIcon,
    MusicIcon,
    UserIcon,
    InfoIcon,
    CheckIcon,
    RefreshIcon,
    LinkIcon,
    EditIcon,
    CloseIcon,
    KeyIcon,
    CpuIcon,
    CoinIcon,
    BellIcon,
    FilmIcon,
    MonitorIcon,
    ListIcon,
    DeleteIcon,
    PlusIcon,
    GiftIcon
  },
  emits: ['close', 'settings-changed'],
  setup(props, { emit }) {
    const musicForm = ref(null);
    const coreForm = ref(null);
    const musicSaving = ref(false);
    const coreSaving = ref(false);
    const isEditing = ref(false);
    const isEditingCore = ref(false);
    const isEditingAnimationSound = ref(false); // 动画和提示音设置编辑状态
    const isEditingFrame = ref(false); // 网站导航设置编辑状态
    const frameSaving = ref(false); // 网站导航设置保存状态
    
    // AI配置相关状态
    const aiConfigForm = ref(null);
    const aiSaving = ref(false);
    const isEditingAi = ref(false);
    
    // 抽奖概率设置相关状态
    const mysteryShopForm = ref(null);
    
    // 网站导航设置数据模型
    const frameSites = ref([
      { name: "cf-tools", url: "https://cf-tools.tianyao.qzz.io/" }
    ]);
    
    // 当前选中的网站
    const currentFrameSiteName = computed(() => {
      const selectedName = localStorage.getItem('selectedFrameSite') || 'cf-tools';
      const site = frameSites.value.find(site => site.name === selectedName);
      return site ? site.name : 'cf-tools';
    });
    
    
    // 音乐源列表
    const musicSources = ref([
      { name: '布谷音乐', url: 'https://www.buguyy.top/' },
      { name: 'qqmp3', url: 'https://www.qqmp3.vip/' }
    ]);
    
    // 音乐源设置数据模型
    const musicSettings = reactive({
      musicSource: musicSources.value[0].url // 默认使用第一个音乐源
    });
    
    // 临时音乐源设置，用于编辑模式
    const tempMusicSettings = reactive({
      musicSource: musicSettings.musicSource
    });
    
    // Core ID设置数据模型
    const coreSettings = reactive({
      coreId: localStorage.getItem('coreId') || '',
      points: 0
    });
    
    // 临时Core ID设置，用于编辑模式
    const tempCoreSettings = reactive({
      coreId: coreSettings.coreId,
      pointsValue: 0
    });
    
    // 管理员设置数据模型
    const adminSettings = reactive({
      adminMode: false // 默认禁用管理员模式
    });
    
    // 动画和提示音设置数据模型
    const animationSoundSettings = reactive({
      enableEntranceAnimation: true, // 默认启用出场动画
      enableNotificationSound: true   // 默认启用消息提示音
    });
    
    // 临时动画和提示音设置，用于编辑模式
    const tempAnimationSoundSettings = reactive({
      enableEntranceAnimation: true,
      enableNotificationSound: true
    });
    
    // 临时网站导航设置，用于编辑模式
    const tempFrameSettings = reactive({
      selectedSite: 'cf-tools',
      sites: [
        { name: "cf-tools", url: "https://cf-tools.tianyao.qzz.io/" }
      ],
      newSiteName: '',
      newSiteUrl: ''
    });
    
    // 版本号点击计数器
    const versionClickCount = ref(0);
    let versionClickTimer = null;
    
    // 抽奖概率设置编辑状态
    const isEditingMysteryShop = ref(false);
    const mysteryShopSaving = ref(false);
    
    // 应用版本号
    const appVersion = ref(import.meta.env.VITE_APP_VERSION);
    
    // AI配置数据模型
    const aiConfig = reactive({
      model: "hunyuan-turbos-latest",
      enable_enhancement: false,
      systemPrompt: "",
      temperature: 0.8,
    });
    
    // 临时AI配置，用于编辑模式
    const tempAiConfig = reactive({});
    
    // 抽奖概率设置数据模型
    const mysteryShopSettings = reactive({
      probability: 35 // 默认抽奖概率为35%
    });
    
    // 临时抽奖概率设置，用于编辑模式
    const tempMysteryShopSettings = reactive({
      probability: 35
    });
    
    // 可用的AI模型选项
    const availableModelOptions = ref([
      {
        label: "通用文生文",
        options: [
          {
            value: "hunyuan-turbos-latest",
            label: "hunyuan-turbos-latest",
            description: `hunyuan-TurboS 混元旗舰大模型最新版本，具备更强的思考能力，更优的体验效果，已更新至最新版本。`,
          },
          {
            value: "hunyuan-turbos-20250716",
            label: "hunyuan-turbos-20250716",
            description: `<div>通用优化：提升文创的内容质量和丰富度，提升文科通用的理解能力、专业知识能力和指令遵循能力，提升理科的推理能力，解题能力</div>`,
          },
        ],
      },
      {
        label: "角色扮演",
        options: [
          {
            value: "hunyuan-large-role-latest",
            label: "hunyuan-large-role-latest",
            description: `适用场景：<div>AI 数字分身、AI 角色扮演、AI情感陪聊等</div>
<div>特性说明：显著提升了角色一致性与对话深度。通过在大规模高质量角色对话数据上的强化训练，模型能深度理解并稳定维持角色设定，有效减少 OOC（脱离角色）问题。</div>
不仅在多轮互动中保持上下文连贯，更大幅提升了聊天的趣味性和沉浸感，使每次对话都生动而富有深度。`,
          },
          {
            value: "hunyuan-role",
            label: "hunyuan-role",
            description: `混元最新版角色扮演模型，混元官方精调训练推出的角色扮演模型，基于混元模型结合角色扮演场景数据集进行增训，在角色扮演场景具有更好的基础效果。`,
          },
        ],
      },
      {
        label: "文生文-推理模型",
        options: [
          {
            value: "hunyuan-t1-latest",
            label: "hunyuan-t1-latest",
            description:
              "业内首个超大规模 Hybrid-Transformer-Mamba 推理模型，扩展推理能力，超强解码速度，进一步对齐人类偏好。",
          },
          {
            value: "hunyuan-t1-20250822",
            label: "hunyuan-t1-20250822",
            description: `<div>大幅提升主模型慢思考模型的高难数学、复杂推理、高难代码、指令遵循、文本创作质量等能力。</div>
<div>通用能力上，相比线上版本，数学难题提升5pp，逻辑推理提升1.8pp，科学提升3pp，代码竞赛提升4pp，文创写作质量提升3pp，知识问答提升4.8pp。</div>`,
          },
        ],
      },
    ]);
    
    // 计算当前选中的音乐源名称
    const currentMusicSourceName = computed(() => {
      const source = musicSources.value.find(item => item.url === musicSettings.musicSource);
      return source ? source.name : '未知音乐源';
    });
    
    // 组件挂载时从localStorage加载设置
    onMounted(() => {
      loadMusicSettings();
      loadCoreSettings();
      loadAdminSettings();
      loadAnimationSoundSettings(); // 加载动画和提示音设置
      loadFrameSettings(); // 加载网站导航设置
      loadAiConfig(); // 加载AI配置
      loadMysteryShopSettings(); // 加载抽奖概率设置
      
      // 监听管理员模式变更事件
      window.addEventListener('admin-mode-changed', handleAdminModeChange);
      
      // 监听AI配置更新事件
      if (window.io && window.socket) {
        window.socket.on("ai-config-updated", handleAiConfigUpdate);
        
        // 监听积分更新事件
        window.socket.on("points_updated", handlePointsUpdated);
        
        // 监听抽奖概率更新事件
        window.socket.on("mystery-shop-probability-updated", handleMysteryShopProbabilityUpdated);
      }
    });
    
    // 组件卸载时清理事件监听
    onUnmounted(() => {
      // 清理事件监听
      if (window.io && window.socket) {
        window.socket.off("ai-config-updated", handleAiConfigUpdate);
        window.socket.off("points_updated", handlePointsUpdated);
        window.socket.off("mystery-shop-probability-updated", handleMysteryShopProbabilityUpdated);
      }
    });
    
    // 处理积分更新事件
    const handlePointsUpdated = (data) => {
      console.log("Setting组件接收到积分更新:", data);
      
      // 如果是当前用户的积分更新，更新本地显示
      if (data.coreId && data.coreId === coreSettings.coreId) {
        coreSettings.points = data.points || 0;
        console.log(`更新Setting中当前用户积分为: ${data.points}`);
      }
    };
    
    // 处理AI配置更新事件
    const handleAiConfigUpdate = (updatedConfig) => {
      Object.assign(aiConfig, updatedConfig);
    };
    
    // 处理抽奖概率更新事件
    const handleMysteryShopProbabilityUpdated = (data) => {
      mysteryShopSettings.probability = data.probability || 35;
      tempMysteryShopSettings.probability = data.probability || 35;
      ElMessage.success('抽奖概率已更新');
    };
    
    // 处理管理员模式变更事件
    const handleAdminModeChange = (event) => {
      if (event.detail && event.detail.adminMode !== undefined) {
        adminSettings.adminMode = event.detail.adminMode;
        saveAdminSettingsToStorage();
      }
    };
    
    // 从localStorage加载Core ID设置
    const loadCoreSettings = async () => {
      try {
        const savedCoreId = localStorage.getItem('coreId');
        if (savedCoreId) {
          coreSettings.coreId = savedCoreId;
          tempCoreSettings.coreId = savedCoreId;
          
          // 加载用户积分
          await loadUserPoints(savedCoreId);
        }
      } catch (error) {
        console.error('加载Core ID设置失败:', error);
        ElMessage.error('加载Core ID设置失败');
      }
    };
    
    // 加载用户积分
    const loadUserPoints = async (coreId) => {
      try {
        // 检查是否在Electron环境中
        const isElectronEnv = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectronEnv ? '/api/user-points' : 'http://localhost:3000/api/user-points';
        
        const userId = getUserId();
        
        const response = await fetch(`${apiUrl}?coreId=${coreId}`, {
          headers: {
            "x-user-id": userId,
            "x-core-id": coreId
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          coreSettings.points = data.data.points || 0;
        } else {
          console.error('加载用户积分失败:', data.message);
        }
      } catch (error) {
        console.error('加载用户积分异常:', error);
      }
    };
    
    // 从localStorage加载音乐源设置
    const loadMusicSettings = () => {
      try {
        const savedSettings = localStorage.getItem('musicSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(musicSettings, parsedSettings);
          Object.assign(tempMusicSettings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveMusicSettingsToStorage();
        }
      } catch (error) {
        console.error('加载音乐源设置失败:', error);
        ElMessage.error('加载音乐源设置失败');
      }
    };
    
    // 从localStorage加载管理员设置
    const loadAdminSettings = () => {
      try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(adminSettings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveAdminSettingsToStorage();
        }
      } catch (error) {
        console.error('加载管理员设置失败:', error);
        ElMessage.error('加载管理员设置失败');
      }
    };
    
    // 从localStorage加载动画和提示音设置
    const loadAnimationSoundSettings = () => {
      try {
        const savedSettings = localStorage.getItem('animationSoundSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          Object.assign(animationSoundSettings, parsedSettings);
          Object.assign(tempAnimationSoundSettings, parsedSettings);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          saveAnimationSoundSettingsToStorage();
        }
      } catch (error) {
        console.error('加载动画和提示音设置失败:', error);
        ElMessage.error('加载动画和提示音设置失败');
      }
    };
    
    // 从localStorage加载网站导航设置
    const loadFrameSettings = () => {
      try {
        const savedSites = localStorage.getItem('frameSites');
        if (savedSites) {
          frameSites.value = JSON.parse(savedSites);
        } else {
          // 如果没有保存的设置，使用默认值并保存
          localStorage.setItem('frameSites', JSON.stringify(frameSites.value));
        }
      } catch (error) {
        console.error('加载网站导航设置失败:', error);
        ElMessage.error('加载网站导航设置失败');
      }
    };
    
    // 加载AI配置
    const loadAiConfig = async () => {
      try {
        // 检查用户是否已经通过WebSocket连接加入聊天室
        if (!window.socket || !window.socket.connected) {
          console.log('用户未连接到聊天室，延迟加载AI配置');
          // 延迟1秒后重试
          setTimeout(loadAiConfig, 1000);
          return;
        }
        
        // 检查用户是否已经成功加入聊天室（通过检查isLoggedIn状态）
        if (typeof window.isLoggedIn === 'undefined' || !window.isLoggedIn) {
          console.log('用户尚未成功加入聊天室，延迟加载AI配置');
          // 延迟1秒后重试
          setTimeout(loadAiConfig, 1000);
          return;
        }
        
        // 检查是否在Electron环境中
        const isElectron = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectron ? '/api/ai-config' : '/api/ai-config';
        
        const userId = getUserId();
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-user-id": userId,
          },
        });
        const data = await response.json();
        if (data.success) {
          Object.assign(aiConfig, data.data);
        } else {
          ElMessage.error("加载AI配置失败: " + data.message);
        }
      } catch (error) {
        console.error("加载AI配置失败:", error);
        ElMessage.error("加载AI配置失败");
      }
    };
    
    // 加载抽奖概率设置
    const loadMysteryShopSettings = async () => {
      try {
        // 检查是否在Electron环境中
        const isElectronEnv = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectronEnv ? '/api/mystery-shop-probability' : 'http://localhost:3000/api/mystery-shop-probability';
        
        const userId = getUserId();
        
        const response = await fetch(apiUrl, {
          headers: {
            "x-user-id": userId,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          mysteryShopSettings.probability = data.data.probability || 35;
          tempMysteryShopSettings.probability = data.data.probability || 35;
        } else {
          console.error('加载抽奖概率设置失败:', data.message);
        }
      } catch (error) {
        console.error('加载抽奖概率设置异常:', error);
      }
    };
    
    // 开始编辑
    const startEditing = () => {
      isEditing.value = true;
      // 重置临时设置为当前设置
      Object.assign(tempMusicSettings, musicSettings);
    };
    
    // 取消编辑
    const cancelEditing = () => {
      isEditing.value = false;
      // 重置临时设置为当前设置
      Object.assign(tempMusicSettings, musicSettings);
    };
    
    // 开始编辑Core ID
    const startEditingCore = () => {
      isEditingCore.value = true;
      // 重置临时设置为当前设置
      Object.assign(tempCoreSettings, coreSettings);
      // 确保积分输入框显示当前积分值
      tempCoreSettings.pointsValue = coreSettings.points || 0;
    };
    
    // 取消编辑Core ID
    const cancelEditingCore = () => {
      isEditingCore.value = false;
      // 重置临时设置为当前设置
      Object.assign(tempCoreSettings, coreSettings);
    };
    
    // 开始编辑AI配置
    const startEditingAi = () => {
      Object.assign(tempAiConfig, aiConfig);
      isEditingAi.value = true;
    };

    // 取消编辑AI配置
    const cancelEditingAi = () => {
      isEditingAi.value = false;
    };
    
    // 开始编辑抽奖概率设置
    const startEditingMysteryShop = () => {
      isEditingMysteryShop.value = true;
      // 重置临时设置为当前设置
      tempMysteryShopSettings.probability = mysteryShopSettings.probability;
    };
    
    // 取消编辑抽奖概率设置
    const cancelEditingMysteryShop = () => {
      isEditingMysteryShop.value = false;
      // 重置临时设置为当前设置
      tempMysteryShopSettings.probability = mysteryShopSettings.probability;
    };
    
    // 保存抽奖概率设置
    const saveMysteryShopSettings = async () => {
      mysteryShopSaving.value = true;
      
      try {
        // 验证概率值
        if (tempMysteryShopSettings.probability < 1 || tempMysteryShopSettings.probability > 100) {
          ElMessage.error('抽奖概率必须在1-100之间');
          return;
        }
        
        // 检查是否在Electron环境中
        const isElectronEnv = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectronEnv ? '/api/mystery-shop-probability' : 'http://localhost:3000/api/mystery-shop-probability';
        
        const userId = getUserId();
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId
          },
          body: JSON.stringify({
            probability: tempMysteryShopSettings.probability
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          // 更新实际设置
          mysteryShopSettings.probability = data.data.probability;
          
          // 退出编辑模式
          isEditingMysteryShop.value = false;
          
          // 显示保存成功提示
          ElMessage.success('抽奖概率设置保存成功');
        } else {
          ElMessage.error(`抽奖概率设置失败: ${data.message}`);
        }
      } catch (error) {
        console.error('保存抽奖概率设置异常:', error);
        ElMessage.error('保存抽奖概率设置失败');
      } finally {
        mysteryShopSaving.value = false;
      }
    };
    
    // 开始编辑动画和提示音设置
    const startEditingAnimationSound = () => {
      isEditingAnimationSound.value = true;
      // 重置临时设置为当前设置
      Object.assign(tempAnimationSoundSettings, animationSoundSettings);
    };
    
    // 取消编辑动画和提示音设置
    const cancelEditingAnimationSound = () => {
      isEditingAnimationSound.value = false;
      // 重置临时设置为当前设置
      Object.assign(tempAnimationSoundSettings, animationSoundSettings);
    };
    
    // 开始编辑网站导航设置
    const startEditingFrame = () => {
      isEditingFrame.value = true;
      // 重置临时设置为当前设置
      tempFrameSettings.selectedSite = localStorage.getItem('selectedFrameSite') || 'cf-tools';
      tempFrameSettings.sites = [...frameSites.value];
      tempFrameSettings.newSiteName = '';
      tempFrameSettings.newSiteUrl = '';
    };
    
    // 取消编辑网站导航设置
    const cancelEditingFrame = () => {
      isEditingFrame.value = false;
      // 重置临时设置为当前设置
      tempFrameSettings.newSiteName = '';
      tempFrameSettings.newSiteUrl = '';
    };
    
    // 添加新网站
    const addFrameSite = () => {
      if (!tempFrameSettings.newSiteName.trim() || !tempFrameSettings.newSiteUrl.trim()) {
        ElMessage.warning('请填写完整的网站名称和URL');
        return;
      }
      
      // 检查名称是否已存在
      if (tempFrameSettings.sites.some(site => site.name === tempFrameSettings.newSiteName)) {
        ElMessage.warning('网站名称已存在');
        return;
      }
      
      // 添加新网站
      tempFrameSettings.sites.push({
        name: tempFrameSettings.newSiteName.trim(),
        url: tempFrameSettings.newSiteUrl.trim()
      });
      
      // 清空输入框
      tempFrameSettings.newSiteName = '';
      tempFrameSettings.newSiteUrl = '';
      
      ElMessage.success('网站添加成功');
    };
    
    // 删除网站
    const removeFrameSite = (siteName) => {
      // 不允许删除cf-tools
      if (siteName === 'cf-tools') {
        ElMessage.warning('不能删除默认网站');
        return;
      }
      
      // 如果删除的是当前选中的网站，则切换到默认网站
      if (tempFrameSettings.selectedSite === siteName) {
        tempFrameSettings.selectedSite = 'cf-tools';
      }
      
      // 从列表中删除
      const index = tempFrameSettings.sites.findIndex(site => site.name === siteName);
      if (index !== -1) {
        tempFrameSettings.sites.splice(index, 1);
        ElMessage.success('网站删除成功');
      }
    };
    
    // 保存动画和提示音设置
    const saveAnimationSoundSettings = () => {
      // 更新实际设置
      Object.assign(animationSoundSettings, tempAnimationSoundSettings);
      
      // 保存到localStorage
      saveAnimationSoundSettingsToStorage();
      
      // 触发设置变更事件，父组件可以监听此事件
      emit('settings-changed', { type: 'animationSound', ...animationSoundSettings });
      
      // 发送全局事件，通知Chat组件更新动画和提示音设置
      window.dispatchEvent(new CustomEvent('animation-sound-settings-changed', {
        detail: { ...animationSoundSettings }
      }));
      
      // 退出编辑模式
      isEditingAnimationSound.value = false;
      
      // 显示保存成功提示
      ElMessage.success('动画和提示音设置保存成功');
    };
    
    // 保存网站导航设置
    const saveFrameSettings = () => {
      frameSaving.value = true;
      
      try {
        // 更新实际设置
        frameSites.value = [...tempFrameSettings.sites];
        
        // 保存到localStorage
        localStorage.setItem('frameSites', JSON.stringify(frameSites.value));
        localStorage.setItem('selectedFrameSite', tempFrameSettings.selectedSite);
        
        // 发送全局事件，通知Frame组件更新
        window.dispatchEvent(new CustomEvent('frame-sites-changed', {
          detail: { 
            sites: frameSites.value,
            selectedSite: tempFrameSettings.selectedSite
          }
        }));
        
        // 退出编辑模式
        isEditingFrame.value = false;
        
        // 显示保存成功提示
        ElMessage.success('网站导航设置保存成功');
      } catch (error) {
        console.error('保存网站导航设置失败:', error);
        ElMessage.error('保存网站导航设置失败');
      } finally {
        frameSaving.value = false;
      }
    };

    // 保存AI配置
    const saveAiConfig = async () => {
      await aiConfigForm.value.validate();
      aiSaving.value = true;
      
      try {
        // 检查用户是否已经通过WebSocket连接加入聊天室
        if (!window.socket || !window.socket.connected) {
          ElMessage.error("请先连接到聊天室");
          aiSaving.value = false;
          return;
        }
        
        // 检查是否在Electron环境中
        const isElectron = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectron ? '/api/ai-config' : '/api/ai-config';
        
        const userId = getUserId();
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
          },
          body: JSON.stringify(tempAiConfig),
        });
        const data = await response.json();
        if (data.success) {
          Object.assign(aiConfig, tempAiConfig);
          isEditingAi.value = false;
          ElMessage.success("AI配置保存成功");
        } else {
          ElMessage.error("保存失败: " + data.message);
        }
      } catch (error) {
        console.error("保存AI配置失败:", error);
        ElMessage.error("保存AI配置失败");
      } finally {
        aiSaving.value = false;
      }
    };
    
    // 保存Core ID设置
    const saveCoreSettings = async () => {
      coreSaving.value = true;
      
      try {
        // 验证表单
        await coreForm.value.validate();
        
        // 更新实际设置
        Object.assign(coreSettings, tempCoreSettings);
        
        // 保存到localStorage
        localStorage.setItem('coreId', coreSettings.coreId);
        
        // 如果有积分操作，则执行积分修改
        if (tempCoreSettings.pointsValue > 0) {
          await updateUserPoints(
            coreSettings.coreId, 
            tempCoreSettings.pointsValue
          );
        }
        
        // 退出编辑模式
        isEditingCore.value = false;
        
        // 显示保存成功提示
        ElMessage.success('客户端ID设置保存成功，即将重载应用');
        
        // 延迟重载应用，让用户看到成功提示
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('保存Core ID设置失败:', error);
        ElMessage.error('保存Core ID设置失败，请检查输入');
      } finally {
        coreSaving.value = false;
      }
    };
    
    // 更新用户积分
    const updateUserPoints = async (coreId, points) => {
      try {
        // 检查是否在Electron环境中
        const isElectronEnv = window.electronAPI || navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        
        // 在Electron环境中，直接使用本地API
        const apiUrl = isElectronEnv ? '/api/user-points' : 'http://localhost:3000/api/user-points';
        
        const userId = getUserId();
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
            "x-core-id": coreId
          },
          body: JSON.stringify({
            coreId,
            points
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          coreSettings.points = data.data.points || 0;
          ElMessage.success(`积分设置成功`);
        } else {
          ElMessage.error(`积分设置失败: ${data.message}`);
        }
      } catch (error) {
        console.error('更新用户积分异常:', error);
        ElMessage.error('更新用户积分失败');
      }
    };
    
    // 保存音乐源设置
    const saveMusicSettings = async () => {
      musicSaving.value = true;
      
      try {
        // 验证表单
        await musicForm.value.validate();
        
        // 更新实际设置
        Object.assign(musicSettings, tempMusicSettings);
        
        // 保存到localStorage
        saveMusicSettingsToStorage();
        
        // 触发设置变更事件，父组件可以监听此事件
        emit('settings-changed', { type: 'music', ...musicSettings });
        
        // 发送全局事件，通知Music组件重新加载
        window.dispatchEvent(new CustomEvent('music-source-changed', {
          detail: { musicSource: musicSettings.musicSource }
        }));
        
        // 退出编辑模式
        isEditing.value = false;
        
        // 显示保存成功提示
        ElMessage.success('音乐源设置保存成功');
      } catch (error) {
        console.error('保存音乐源设置失败:', error);
        ElMessage.error('保存音乐源设置失败，请检查输入');
      } finally {
        musicSaving.value = false;
      }
    };
    
    // 单独的保存到localStorage的函数
    const saveMusicSettingsToStorage = () => {
      localStorage.setItem('musicSettings', JSON.stringify(musicSettings));
    };
    
    const saveAdminSettingsToStorage = () => {
      localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    };
    
    const saveAnimationSoundSettingsToStorage = () => {
      localStorage.setItem('animationSoundSettings', JSON.stringify(animationSoundSettings));
    };
    
    // 关闭管理员模式
    const disableAdminMode = () => {
      adminSettings.adminMode = false;
      saveAdminSettingsToStorage();
      
      // 发送全局事件，通知Chart组件更新管理员模式
      window.dispatchEvent(new CustomEvent('admin-mode-changed', {
        detail: { adminMode: false }
      }));
      
      ElMessage.info('管理员模式已关闭，需要通过连续点击版本号重新启用');
    };
    
    // 处理版本号点击事件
    const handleVersionClick = () => {
      versionClickCount.value++;
      
      // 清除之前的定时器
      if (versionClickTimer) {
        clearTimeout(versionClickTimer);
      }
      
      // 设置新的定时器，3秒后重置计数
      versionClickTimer = setTimeout(() => {
        versionClickCount.value = 0;
      }, 3000);
      
      // 如果点击次数达到10次，激活管理员模式
      if (versionClickCount.value >= 10) {
        adminSettings.adminMode = true;
        versionClickCount.value = 0;
        ElMessage.success("已进入管理员模式");
        
        // 更新localStorage中的管理员模式设置
        localStorage.setItem('adminSettings', JSON.stringify({ adminMode: true }));
        
        // 发送全局事件，通知其他组件管理员模式已启用
        window.dispatchEvent(new CustomEvent('admin-mode-changed', {
          detail: { adminMode: true }
        }));
        
        // 清除定时器
        if (versionClickTimer) {
          clearTimeout(versionClickTimer);
          versionClickTimer = null;
        }
      }
    };
    
    return {
      musicForm,
      coreForm,
      musicSaving,
      coreSaving,
      isEditing,
      isEditingCore,
      isEditingAnimationSound,
      isEditingFrame,
      isEditingAi,
      isEditingMysteryShop,
      frameSaving,
      mysteryShopSaving,
      musicSettings,
      tempMusicSettings,
      coreSettings,
      tempCoreSettings,
      adminSettings,
      animationSoundSettings,
      tempAnimationSoundSettings,
      frameSites,
      tempFrameSettings,
      currentFrameSiteName,
      mysteryShopSettings,
      tempMysteryShopSettings,
      musicSources,
      currentMusicSourceName,
      startEditing,
      cancelEditing,
      startEditingCore,
      cancelEditingCore,
      startEditingAnimationSound,
      cancelEditingAnimationSound,
      startEditingFrame,
      cancelEditingFrame,
      addFrameSite,
      removeFrameSite,
      saveMusicSettings,
      saveCoreSettings,
      saveAnimationSoundSettings,
      saveFrameSettings,
      disableAdminMode,
      isElectron,
      appVersion,
      handleVersionClick,
      // AI配置相关
      aiConfigForm,
      aiSaving,
      aiConfig,
      tempAiConfig,
      availableModelOptions,
      startEditingAi,
      cancelEditingAi,
      saveAiConfig,
      loadAiConfig,
      handleAiConfigUpdate,
      handlePointsUpdated,
      loadUserPoints,
      updateUserPoints,
      // 抽奖概率设置相关
      startEditingMysteryShop,
      cancelEditingMysteryShop,
      saveMysteryShopSettings,
      loadMysteryShopSettings,
      handleMysteryShopProbabilityUpdated
    };
  }
};
</script>

<style scoped>
.setting-container {
  padding: 24px;
  min-height: 100vh;
  background-color: var(--background-primary);
  box-sizing: border-box;
}

/* 页面标题区域 */
.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.page-title .el-icon {
  margin-right: 12px;
  font-size: 28px;
  color: var(--accent-primary);
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

/* 版本信息样式 */
.version-info {
  user-select: none;
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: var(--background-tertiary);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.version-info:hover {
  background-color: var(--background-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.version-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-right: 6px;
}

.version-number {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-primary);
}

/* 设置卡片网格 */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

/* 卡片样式 */
.setting-card {
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: fit-content;
}

.setting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.music-card .header-icon {
  background: linear-gradient(135deg, #ff7e5f, #feb47b);
  color: white;
}

.core-card .header-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.animation-sound-card .header-icon {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.header-icon .el-icon {
  font-size: 24px;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 头部操作区域 */
.header-actions {
  display: flex;
  align-items: center;
}

.edit-btn {
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-weight: 500;
}

.edit-btn .el-icon {
  margin-right: 6px;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

/* 卡片内容 */
  .card-content {
    padding: 0;
  }
  
  /* 管理员卡片样式 */
  .admin-card {
    border: 1px solid var(--el-color-danger-light-7);
  }
  
  .admin-header-icon {
    background: linear-gradient(135deg, #f56c6c, #e64242);
    color: white;
  }
  
  /* AI卡片样式 */
  .ai-card {
    border: 1px solid var(--el-color-primary-light-7);
  }
  
  .ai-card .header-icon {
    background: linear-gradient(135deg, #409eff, #337ecc);
    color: white;
  }
  
  .model-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .model-label {
    font-weight: 500;
  }
  
  .model-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  .admin-status-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }
  
  .admin-status-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background-color: var(--el-color-danger-light-9);
    border-radius: 8px;
    border-left: 4px solid var(--el-color-danger);
  }
  
  .admin-status-icon {
    color: var(--el-color-danger);
    font-size: 24px;
  }
  
  .admin-status-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .admin-actions {
    display: flex;
    justify-content: center;
  }
  
  .admin-close-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
  }

.compact-form {
  padding: 0;
}

.compact-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.compact-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-primary);
  padding-bottom: 8px;
}

.form-item-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  line-height: 1.4;
}

/* 信息展示区域 */
.info-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.info-label .el-icon {
  margin-right: 8px;
  font-size: 16px;
  color: var(--accent-primary);
}

.info-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.url-value {
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  background-color: var(--background-tertiary);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .setting-container {
    padding: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

/* 暗黑主题适配 - Element Plus组件 */
/* 输入框基础样式 */
.theme-dark :deep(.el-input__wrapper) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
  box-shadow: none !important;
}

.theme-dark :deep(.el-input__wrapper:hover) {
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-input__wrapper.is-focus) {
  border-color: var(--accent-primary) !important;
  box-shadow: 0 0 0 2px rgba(144, 147, 153, 0.1) !important;
}

.theme-dark :deep(.el-input__inner) {
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

/* 选择器样式 */
.theme-dark :deep(.el-select .el-input__wrapper) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-select .el-input__inner) {
  color: var(--text-primary) !important;
  background-color: transparent !important;
}

/* 卡片样式 */
.theme-dark :deep(.el-card) {
  background-color: var(--background-secondary) !important;
  border-color: var(--border-color) !important;
}

.theme-dark :deep(.el-card__header) {
  border-bottom-color: var(--border-color) !important;
}

/* 标签样式 */
.theme-dark :deep(.el-tag) {
  background-color: var(--background-tertiary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

.theme-dark :deep(.el-tag.el-tag--success) {
  background-color: rgba(103, 194, 58, 0.2) !important;
  border-color: rgba(103, 194, 58, 0.3) !important;
  color: #67c23a !important;
}

.theme-dark :deep(.el-tag.el-tag--info) {
  background-color: rgba(144, 147, 153, 0.2) !important;
  border-color: rgba(144, 147, 153, 0.3) !important;
  color: #909399 !important;
}
.header-title{
  display: flex;
  align-items: center;
}
</style>