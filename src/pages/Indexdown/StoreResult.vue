<template>
  <div class="store-result-container">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="merchants.length === 0" class="no-result">未找到匹配的店铺</div>
    <div v-else>
      <div class="list-header">
        共找到 <span class="count">{{ total }}</span> 家店铺，当前显示前 {{ merchants.length }} 家
      </div>

      <div class="merchant-list">
        <div v-for="m in merchants" :key="m.merchantId" class="merchant-card">
          <div class="merchant-header">
            <div class="logo-placeholder">🏪</div>
            <div class="merchant-info">
              <div class="merchant-name">{{ m.merchantName }}</div>
              <div class="merchant-id">店铺编号：{{ m.merchantNo || m.merchantId }}</div>
              <div class="merchant-meta">
                <span>联系人：{{ m.contactPerson || '暂无' }}</span>
                <span class="dot">·</span>
                <span>电话：{{ m.contactPhone || '暂无' }}</span>
                <span class="dot">·</span>
                <span>地址：{{ m.address || '暂无' }}</span>
              </div>
              <div class="merchant-status" :class="getStatusClass(m.status)">状态：{{ getStatusLabel(m.status) }}</div>
            </div>
          </div>

          <div class="section-header small">
            <div class="icon-circle"></div>
            <div class="text-content">
              <div class="title">店铺商品示例</div>
              <div class="subtitle">部分商品展示，点击查看详情</div>
            </div>
          </div>
          <div class="product-grid">
            <router-link
              v-for="p in productsByMerchant[m.merchantId] || []"
              :key="p.itemId"
              class="product-item"
              :to="'/productInfo/' + p.itemId"
            >
              <img :src="getProductImage(p)" :alt="p.title" class="product-image" @error="handleImageError" />
              <div class="product-name">{{ p.title }}</div>
              <div class="product-price">¥{{ (p.price || 0).toFixed(2) }}</div>
              <div class="product-subtitle" v-if="p.subTitle">{{ p.subTitle }}</div>
            </router-link>
            <div v-if="!(productsByMerchant[m.merchantId] || []).length" class="no-products">暂无商品</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from '../../axios';
import avatarUrl from '@/assets/images/avatar.png';

const route = useRoute();
const loading = ref(true);
const merchants = ref([]);
const total = ref(0);
const productsByMerchant = ref({});
const prodLoading = ref(false);

const getStatusLabel = (s) => {
  if (s === 1) return '正常';
  if (s === 0) return '禁用';
  if (s === 2) return '待审核';
  return '未知';
};
const getStatusClass = (s) => {
  return s === 1 ? 'ok' : s === 2 ? 'pending' : 'disabled';
};

const toAbsoluteUrl = (u) => {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  const base = axios.defaults.baseURL || '';
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
};
const getProductImage = (product) => {
  if (product.picUrl) {
    const images = String(product.picUrl)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (images.length) return toAbsoluteUrl(images[0]);
  }
  if (product.skuPic) return toAbsoluteUrl(product.skuPic);
  return avatarUrl;
};

const handleImageError = (e) => {
  e.target.src = avatarUrl;
};

const fetchMerchants = async (q) => {
  // 若是纯数字：先按ID精准查询；未命中则回退到店铺名模糊查询
  const id = Number(q);
  if (!Number.isNaN(id) && String(id) === q) {
    try {
      const byId = await axios.get(`/merchant/getMerchant/${id}`);
      if (byId.data && byId.data.code === 200 && byId.data.data) {
        const m = byId.data.data;
        if (m.status === 1) {
          merchants.value = [m];
          total.value = 1;
          return;
        }
        // 若ID命中但状态非正常，回退到名称模糊查询
      }
    } catch (err) {
      // 例如未登录返回401时，继续使用编号或名称模糊查询
    }
    // 未命中ID，继续用数字字符串进行店铺名模糊查询
  }

  // 若像店铺编号（M开头+数字）或纯数字，先尝试按店铺编号进行模糊查询
  const isDigits = /^\d+$/.test(q || '');
  const isMerchantNoLike = /^m\d+$/i.test(q || '') || isDigits;
  if (isMerchantNoLike) {
    const byNo = await axios.get('/merchant', { params: { current: 1, size: 20, merchantNo: q, status: 1 } });
    if (byNo.data && byNo.data.code === 200) {
      const page = byNo.data.data || {};
      const raw = Array.isArray(page.records) ? page.records : [];
      const filtered = raw.filter(m => m && m.status === 1);
      if (filtered.length > 0) {
        merchants.value = filtered;
        total.value = page.total || filtered.length;
        return;
      }
    }
    // 若编号模糊查询无结果，继续名称模糊查询
  }

  const byName = await axios.get('/merchant', { params: { current: 1, size: 20, merchantName: q, status: 1 } });
  if (byName.data && byName.data.code === 200) {
    const page = byName.data.data || {};
    const raw = Array.isArray(page.records) ? page.records : [];
    // 兜底前端过滤，确保只展示状态正常店铺
    merchants.value = raw.filter(m => m && m.status === 1);
    total.value = page.total || merchants.value.length;
  } else {
    merchants.value = [];
    total.value = 0;
  }
};

const fetchProductsForMerchant = async (merchantId) => {
  try {
    const { data } = await axios.get('/item', { params: { current: 1, size: 6, sellerId: merchantId, status: 1 } });
    if (data.code === 200) {
      productsByMerchant.value[merchantId] = (data.data.records || []).filter(p => p && p.itemId && p.status === 1);
    } else {
      productsByMerchant.value[merchantId] = [];
    }
  } catch (e) {
    productsByMerchant.value[merchantId] = [];
  }
};

onMounted(async () => {
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : '';
  loading.value = true;
  try {
    await fetchMerchants(q);
    // 为每家店铺加载少量商品示例（若 sellerId 与 merchantId 一致可打开注释）
    for (const m of merchants.value) {
      await fetchProductsForMerchant(m.merchantId);
    }
  } catch (e) {
    console.error('加载店铺列表失败:', e);
    merchants.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.store-result-container {
  width: 100%;
  max-width: 1440px;
  min-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}
.loading, .no-result, .no-products {
  text-align: center;
  color: #888;
  padding: 20px;
}
.list-header {
  font-size: 14px;
  color: #555;
  margin-bottom: 16px;
  background: #f7f8fa;
  border: 1px solid #e5e6eb;
  border-radius: 10px;
  padding: 10px 12px;
}
.list-header .count { color: #f53f3f; font-weight: 600; }
.merchant-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: stretch;
}
.merchant-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e5e6eb;
  transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
}
.merchant-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.12); transform: translateY(-3px); border-color: #d0d3d8; }
.merchant-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e5e6eb;
}
.logo-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #eef1f5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 1px solid #e5e6eb;
}
.merchant-info {
  flex: 1;
}
.merchant-name {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
}
.merchant-meta {
  margin-top: 6px;
  color: #86909c;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.merchant-meta .dot { color: #c9cdd4; }
.merchant-status {
  margin-top: 8px;
  font-size: 12px;
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}
.merchant-status.ok { color: #1f7a1f; background: #e9f7e9; border-color: #c9e9c9; }
.merchant-status.pending { color: #7a5b00; background: #fff7e6; border-color: #f3d19e; }
.merchant-status.disabled { color: #a61d24; background: #fff1f0; border-color: #ffccc7; }

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 6px 0 12px;
}
.section-header.small { margin-top: 10px; }
.icon-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409eff;
}
.section-header.small .title { position: relative; padding-left: 10px; }
.section-header.small .title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: #409eff;
}
.text-content .title { font-size: 16px; font-weight: 600; }
.text-content .subtitle { font-size: 12px; color: #86909c; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  width: 100%;
}
.product-item {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 8px;
  background-color: #fff;
  border: 1px solid #e5e6eb;
  transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
  text-decoration: none;
  color: inherit;
}
.product-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: #d0d3d8;
}
.product-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: transform .2s ease;
}
.product-item:hover .product-image { transform: scale(1.02); }
.product-name { font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #333; }
.product-price { color: #ff4d4f; font-size: 16px; font-weight: bold; }
.product-subtitle { font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-products {
  background: #f7f8fa;
  border: 1px dashed #e5e6eb;
  border-radius: 8px;
}

</style>
