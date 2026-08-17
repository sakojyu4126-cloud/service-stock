import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data-store.json");

app.use(express.json());

// Helper function to calculate tax-excluded price and selling price (20% markup)
function calculatePrices(priceInclTax: number) {
  const priceExclTax = Math.round(priceInclTax / 1.1);
  const sellingPrice = Math.round(priceExclTax * 1.2);
  return { priceExclTax, sellingPrice };
}

// Helper to determine billing month based on 15th cutoff
function getBillingMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  let year = d.getFullYear();
  let month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  if (day > 15) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return `${month}月`;
}

// Initial mockup / template data
const initialProducts = [
  { id: "p1", maker: "リフレ", category: "尿取りパット類", name: "スピードキャッチパッド スーパー(10回吸収)", capacity: "30枚", size: "-", priceInclTax: 2273, priceExclTax: 2066, sellingPrice: 2480, currentStock: 12 },
  { id: "p2", maker: "いちばん", category: "リハビリパンツ", name: "幅広フィット テープ止めタイプ", capacity: "20枚", size: "M", priceInclTax: 1618, priceExclTax: 1471, sellingPrice: 1765, currentStock: 5 },
  { id: "p3", maker: "リフレ", category: "リハビリパンツ", name: "はくパンツ 軽やかなうす型", capacity: "34枚", size: "M", priceInclTax: 2205, priceExclTax: 2005, sellingPrice: 2406, currentStock: 0 },
  { id: "p4", maker: "リフレ", category: "テープ止めオムツ", name: "簡単テープ止めタイプ", capacity: "30枚", size: "M", priceInclTax: 2965, priceExclTax: 2695, sellingPrice: 3235, currentStock: 2 },
  { id: "p5", maker: "DAFI", category: "流せるおしりふき", name: "流せるおしりふき 大人用", capacity: "80枚", size: "-", priceInclTax: 594, priceExclTax: 540, sellingPrice: 648, currentStock: 15 },
  { id: "p6", maker: "アテント", category: "尿取りパット類", name: "夜安心4回尿取りパット", capacity: "28枚", size: "-", priceInclTax: 1357, priceExclTax: 1234, sellingPrice: 1480, currentStock: 1 },
  { id: "p7", maker: "リフレ", category: "尿取りパット類", name: "パッドタイプ 男女兼用 レギュラー", capacity: "30枚", size: "-", priceInclTax: 620, priceExclTax: 564, sellingPrice: 676, currentStock: 8 },
  { id: "p8", maker: "アクティ", category: "流せるおしりふき", name: "おしりふき 大容量 100枚 流せる", capacity: "100枚", size: "-", priceInclTax: 594, priceExclTax: 540, sellingPrice: 648, currentStock: 10 },
  { id: "p9-s", maker: "西川", category: "PVC介護手袋", name: "PVC介護用使い捨て手袋 S", capacity: "100枚", size: "S", priceInclTax: 980, priceExclTax: 891, sellingPrice: 1070, currentStock: 10 },
  { id: "p9-m", maker: "西川", category: "PVC介護手袋", name: "PVC介護用使い捨て手袋 M", capacity: "100枚", size: "M", priceInclTax: 980, priceExclTax: 891, sellingPrice: 1070, currentStock: 24 },
  { id: "p9-l", maker: "西川", category: "PVC介護手袋", name: "PVC介護用使い捨て手袋 L", capacity: "100枚", size: "L", priceInclTax: 980, priceExclTax: 891, sellingPrice: 1070, currentStock: 12 },
  { id: "p10", maker: "白十字", category: "リハビリパンツ", name: "やわ楽 リハビリパンツ", capacity: "34枚", size: "M-L", priceInclTax: 1648, priceExclTax: 1498, sellingPrice: 1798, currentStock: 3 },
  { id: "p11", maker: "マーヤ", category: "尿取りパット類", name: "超吸収 大パット1200", capacity: "30枚", size: "-", priceInclTax: 1455, priceExclTax: 1323, sellingPrice: 1587, currentStock: 2 },
  { id: "p12", maker: "マーヤ", category: "尿取りパット類", name: "夜長時間用 尿取りパット", capacity: "30枚", size: "-", priceInclTax: 1029, priceExclTax: 935, sellingPrice: 1123, currentStock: 1 }
];

const initialStockpiles = [
  // Category ①衛生用品-1（日常業務用）
  { id: "s1", name: "PVC使い捨て手袋S", currentStock: 10, requiredStock: 10, unit: "箱", location: "5番館倉庫", manager: "衛生担当", notes: "パウダーフリーS", alertDismissed: false },
  { id: "s2", name: "PVC使い捨て手袋M", currentStock: 40, requiredStock: 40, unit: "箱", location: "5番館倉庫", manager: "衛生担当", notes: "パウダーフリーM", alertDismissed: false },
  { id: "s3", name: "PVC使い捨て手袋L", currentStock: 15, requiredStock: 15, unit: "箱", location: "5番館倉庫", manager: "衛生担当", notes: "パウダーフリーL", alertDismissed: false },
  { id: "s4", name: "流せるお尻拭き", currentStock: 20, requiredStock: 20, unit: "袋", location: "5番館倉庫", manager: "事務員", notes: "日常業務用おしりふき", alertDismissed: false },
  { id: "s5", name: "次亜塩素酸ナトリウム（12％）", currentStock: 3, requiredStock: 3, unit: "箱", location: "5番館倉庫", manager: "衛生担当", notes: "消毒・除菌剤", alertDismissed: false },
  { id: "s6", name: "消毒用アルコール（10L）", currentStock: 5, requiredStock: 5, unit: "箱", location: "5番館倉庫", manager: "事務員", notes: "大容量10L", alertDismissed: false },
  { id: "s7", name: "消毒用アルコール（スプレー）", currentStock: 15, requiredStock: 15, unit: "本", location: "5番館倉庫", manager: "事務員", notes: "各フロア設置用", alertDismissed: false },
  { id: "s8", name: "消毒用アルコール（5L）", currentStock: 5, requiredStock: 5, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "大容量5L", alertDismissed: false },

  // Category ②衛生用品-2（BCP感染症対策）
  { id: "s9", name: "抗原検査キット", currentStock: 100, requiredStock: 100, unit: "キット", location: "5番館倉庫", manager: "管理職", notes: "コロナ・インフル両方対応", alertDismissed: false },
  { id: "s10", name: "マスク（N95高機能マスク）", currentStock: 200, requiredStock: 200, unit: "枚", location: "5番館倉庫", manager: "管理職", notes: "医療・感染用", alertDismissed: false },
  { id: "s11", name: "マスク（不織布）", currentStock: 500, requiredStock: 500, unit: "枚", location: "5番館倉庫", manager: "事務員", notes: "日常業務・来客用", alertDismissed: false },
  { id: "s12", name: "体温計（腋下）", currentStock: 10, requiredStock: 10, unit: "本", location: "桃の郷事務所", manager: "看護スタッフ", notes: "接触型通常タイプ", alertDismissed: false },
  { id: "s13", name: "体温計（非接触型）", currentStock: 5, requiredStock: 5, unit: "本", location: "桃の郷事務所", manager: "看護スタッフ", notes: "検温用", alertDismissed: false },
  { id: "s14", name: "パルスオキシメーター", currentStock: 5, requiredStock: 5, unit: "個", location: "桃の郷事務所", manager: "看護スタッフ", notes: "SpO2測定用", alertDismissed: false },
  { id: "s15", name: "アルコール綿（個包装）", currentStock: 1000, requiredStock: 1000, unit: "個", location: "5番館倉庫", manager: "看護スタッフ", notes: "個包装（2枚入）", alertDismissed: false },
  { id: "s16", name: "ガーゼ類", currentStock: 10, requiredStock: 10, unit: "個", location: "5番館倉庫", manager: "看護スタッフ", notes: "滅菌ガーゼ", alertDismissed: false },
  { id: "s17", name: "ガウン（薄手）", currentStock: 200, requiredStock: 200, unit: "枚", location: "5番館倉庫", manager: "衛生担当", notes: "不織布簡易ガウン", alertDismissed: false },
  { id: "s18", name: "ガウン（厚手）", currentStock: 100, requiredStock: 100, unit: "枚", location: "5番館倉庫", manager: "衛生担当", notes: "撥水フルプロテクション", alertDismissed: false },
  { id: "s19", name: "フェイスシールド", currentStock: 80, requiredStock: 80, unit: "個", location: "5番館倉庫", manager: "衛生担当", notes: "感染防止シールド", alertDismissed: false },
  { id: "s20", name: "ゴーグル", currentStock: 10, requiredStock: 10, unit: "個", location: "5番館倉庫", manager: "衛生担当", notes: "保護メガネ", alertDismissed: false },
  { id: "s21", name: "キャップ", currentStock: 200, requiredStock: 200, unit: "個", location: "5番館倉庫", manager: "衛生担当", notes: "ヘアカバー", alertDismissed: false },
  { id: "s22", name: "紙コップ", currentStock: 200, requiredStock: 200, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "非常災害・来客用", alertDismissed: false },
  { id: "s23", name: "使い捨て食器（飯碗用）", currentStock: 100, requiredStock: 100, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "非常災害時用 飯碗", alertDismissed: false },
  { id: "s24", name: "使い捨て食器（汁物用）", currentStock: 100, requiredStock: 100, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "非常災害時用 汁物", alertDismissed: false },
  { id: "s25", name: "使い捨て食器（弁当スタイル）", currentStock: 100, requiredStock: 100, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "非常災害時用 弁当", alertDismissed: false },
  { id: "s26", name: "使い捨て食器（丼用）", currentStock: 100, requiredStock: 100, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "非常災害時用 丼", alertDismissed: false },

  // Category ③消耗品類（ハンドペーパー等）
  { id: "s27", name: "中性洗剤（厨房用）", currentStock: 2, requiredStock: 2, unit: "箱", location: "5番館倉庫", manager: "事務員", notes: "厨房業務用", alertDismissed: false },
  { id: "s28", name: "中性洗剤（強力）", currentStock: 5, requiredStock: 5, unit: "本", location: "5番館倉庫", manager: "事務員", notes: "頑固な汚れ落とし用", alertDismissed: false },
  { id: "s29", name: "ゴミ袋 大（45L）", currentStock: 50, requiredStock: 50, unit: "袋", location: "5番館倉庫", manager: "事務員", notes: "業務用45L", alertDismissed: false },
  { id: "s30", name: "ゴミ袋 中（30L）", currentStock: 50, requiredStock: 50, unit: "袋", location: "5番館倉庫", manager: "事務員", notes: "業務用30L", alertDismissed: false },
  { id: "s31", name: "薬用ハンドソープ（5L）", currentStock: 10, requiredStock: 10, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "手洗い場詰替え用", alertDismissed: false },
  { id: "s32", name: "手指消毒ジェル", currentStock: 20, requiredStock: 20, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "携帯・卓上用", alertDismissed: false },
  { id: "s33", name: "ハイター", currentStock: 5, requiredStock: 5, unit: "本", location: "5番館倉庫", manager: "事務員", notes: "漂白・除菌用", alertDismissed: false },
  { id: "s34", name: "ウタマロ", currentStock: 5, requiredStock: 5, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "部分汚れ用", alertDismissed: false },
  { id: "s35", name: "トイレクリーナー液（5L）", currentStock: 3, requiredStock: 3, unit: "本", location: "5番館倉庫", manager: "事務員", notes: "トイレ清掃用", alertDismissed: false },

  // Category ④デイサービス
  { id: "s36", name: "シャンプー／リンス", currentStock: 5, requiredStock: 5, unit: "本", location: "デイサービス浴室", manager: "介護スタッフ", notes: "利用者お風呂用", alertDismissed: false },
  { id: "s37", name: "ボディソープ", currentStock: 5, requiredStock: 5, unit: "本", location: "デイサービス浴室", manager: "介護スタッフ", notes: "利用者お風呂用", alertDismissed: false },
  { id: "s38", name: "トイレットペーパー", currentStock: 120, requiredStock: 120, unit: "個", location: "5番館倉庫", manager: "事務員", notes: "消耗品", alertDismissed: false },
  { id: "s39", name: "ハンドペーパー", currentStock: 250, requiredStock: 250, unit: "袋", location: "5番館倉庫", manager: "事務員", notes: "ペーパータオル", alertDismissed: false },
  { id: "s40", name: "お風呂洗剤（4L）", currentStock: 3, requiredStock: 3, unit: "本", location: "デイサービス浴室", manager: "介護スタッフ", notes: "お風呂清掃用", alertDismissed: false }
];

const initialWithdrawals = [
  { id: "w1", date: "2026-07-05 10:30", userName: "中島義昭 様", staffName: "山田", productId: "p1", product: initialProducts[0], quantity: 1, billingMonth: "7月", status: "billed", billedDate: "2026-07-07" },
  { id: "w2", date: "2026-07-05 11:45", userName: "中島富美子 様", staffName: "佐藤", productId: "p2", product: initialProducts[1], quantity: 1, billingMonth: "7月", status: "unbilled", billedDate: null },
  { id: "w3", date: "2026-07-01 14:15", userName: "大西 様", staffName: "高橋", productId: "p3", product: initialProducts[2], quantity: 1, billingMonth: "7月", status: "unbilled", billedDate: null },
  { id: "w4", date: "2026-06-20 09:10", userName: "森 様", staffName: "山田", productId: "p4", product: initialProducts[3], quantity: 1, billingMonth: "7月", status: "unbilled", billedDate: null }
];

const initialUsers = ["中島義昭 様", "中島富美子 様", "大西 様", "森 様"];
const initialStaff = ["山田", "佐藤", "高橋", "渡辺", "鈴木"];

function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .replace(/[\s　]+/g, "")
    .replace(/[（()）]/g, "")
    .replace(/[-ー]/g, "")
    .replace(/[a-zA-Z]/g, (l) => l.toLowerCase());
}

async function readDatabase() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    let modified = false;
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = [...initialUsers];
      modified = true;
    }
    if (!parsed.staff || parsed.staff.length === 0) {
      parsed.staff = [...initialStaff];
      modified = true;
    }
    if (!parsed.staffWithdrawals) {
      parsed.staffWithdrawals = [];
      modified = true;
    }
    if (!parsed.stockpiles) {
      parsed.stockpiles = [];
      modified = true;
    }

    // Name mapping to migrate legacy/fuzzy names to the standard clean ones in the categories dropdown
    const nameMapping: Record<string, string> = {
      "抗原検査キット": "抗原検査キット",
      "マスク（N95他高機能マスク）": "マスク（N95高機能マスク）",
      "マスク（不織布）": "マスク（不織布）",
      "体温計（腋下）": "体温計（腋下）",
      "体温計（非接触型）": "体温計（非接触型）",
      "パルスオキシメーター": "パルスオキシメーター",
      "消毒用アルコール": "消毒用アルコール（スプレー）",
      "消毒用アルコール(5L）": "消毒用アルコール（5L）",
      "消毒用アルコールスプレー": "消毒用アルコール（スプレー）",
      "手指消毒ジェル": "手指消毒ジェル",
      "次亜塩素酸ナトリウム": "次亜塩素酸ナトリウム（12％）",
      "次亜塩素酸ナトリウム（5L）": "次亜塩素酸ナトリウム（12％）",
      "ハイター": "ハイター",
      "薬用ハンドソープ（5L)": "薬用ハンドソープ（5L）",
      "中性洗剤（10L)": "中性洗剤（厨房用）",
      "アルコール綿（個包装）": "アルコール綿（個包装）",
      "ガーゼ": "ガーゼ類",
      "ガウン(軽微）": "ガウン（薄手）",
      "ガウン（重装備）": "ガウン（厚手）",
      "PVC使い捨て手袋　L": "PVC使い捨て手袋L",
      "PVC使い捨て手袋　M": "PVC使い捨て手袋M",
      "PVC使い捨て手袋　S": "PVC使い捨て手袋S",
      "フェイスシールド": "フェイスシールド",
      "ゴーグル": "ゴーグル",
      "キャップ": "キャップ",
      "トイレットペーパー": "トイレットペーパー",
      "ペーパータオル": "ハンドペーパー",
      "ティッシュペーパー": "ハンドペーパー",
      "使い捨て食器": "使い捨て食器（飯碗用）",
      "紙コップ": "紙コップ",
      "ゴミ袋大45L": "ゴミ袋 大（45L）",
      "ゴミ袋中30L": "ゴミ袋 中（30L）"
    };

    if (parsed.stockpiles) {
      // 1. Rename any old items if they match legacy names exactly
      parsed.stockpiles.forEach((s: any) => {
        if (s.name && nameMapping[s.name]) {
          s.name = nameMapping[s.name];
          modified = true;
        }
      });

      // 2. Merge duplicate stockpile items resulting from renaming
      const uniqueStockpiles: any[] = [];
      parsed.stockpiles.forEach((s: any) => {
        const existing = uniqueStockpiles.find(item => item.name === s.name && item.location === s.location);
        if (existing) {
          existing.currentStock = (existing.currentStock || 0) + (s.currentStock || 0);
          existing.requiredStock = Math.max(existing.requiredStock || 0, s.requiredStock || 0);
          modified = true;
        } else {
          uniqueStockpiles.push(s);
        }
      });
      parsed.stockpiles = uniqueStockpiles;
    }

    // Automatically migrate and inject any missing standard stockpile items
    for (const bcp of initialStockpiles) {
      const normNew = normalizeName(bcp.name);
      const exists = parsed.stockpiles.some((s: any) => normalizeName(s.name) === normNew);
      if (!exists) {
        parsed.stockpiles.push({ ...bcp });
        modified = true;
      }
    }

    // Ensure all stockpile items have a unique, clean sequential ID (e.g., s1, s2, s3, ...)
    if (parsed.stockpiles) {
      parsed.stockpiles.forEach((s: any, i: number) => {
        const expectedId = `s${i + 1}`;
        if (s.id !== expectedId) {
          s.id = expectedId;
          modified = true;
        }
      });
    }

    if (modified) {
      await writeDatabase(parsed);
    }
    return parsed;
  } catch (e) {
    const initialData = {
      products: initialProducts,
      stockpiles: initialStockpiles,
      withdrawals: initialWithdrawals,
      users: initialUsers,
      staff: initialStaff,
      staffWithdrawals: []
    };
    await writeDatabase(initialData);
    return initialData;
  }
}

async function writeDatabase(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// REST APIs
app.get("/api/data", async (req, res) => {
  try {
    const data = await readDatabase();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Database
app.post("/api/reset", async (req, res) => {
  try {
    const initialData = {
      products: initialProducts,
      stockpiles: initialStockpiles,
      withdrawals: initialWithdrawals,
      users: initialUsers,
      staff: initialStaff,
      staffWithdrawals: [],
    };
    await writeDatabase(initialData);
    res.json({ message: "Database reset successful", data: initialData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Withdrawals API
app.post("/api/withdrawals", async (req, res) => {
  try {
    const { userName, staffName, productId, quantity, date } = req.body;
    const db = await readDatabase();
    const product = db.products.find((p: any) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const cleanUserName = userName.endsWith("様") ? userName : `${userName} 様`;
    const withdrawDate = date || new Date().toISOString().replace("T", " ").substring(0, 16);
    const billingM = getBillingMonth(withdrawDate);
    const qty = Number(quantity) || 1;

    // Auto-reduce product catalog stock (diaper / hygiene product stock)
    if (product.currentStock !== undefined) {
      product.currentStock = Math.max(0, product.currentStock - qty);
    } else {
      product.currentStock = 0;
    }

    const newWithdrawal = {
      id: "w_" + Math.random().toString(36).substring(2, 11),
      date: withdrawDate,
      userName: cleanUserName,
      staffName,
      productId,
      product: { ...product }, // copy containing updated stock
      quantity: qty,
      billingMonth: billingM,
      status: "unbilled",
      billedDate: null
    };

    db.withdrawals.unshift(newWithdrawal);

    // Auto-update users and staff list if new ones are entered
    if (!db.users.includes(cleanUserName)) {
      db.users.push(cleanUserName);
    }
    if (staffName && !db.staff.includes(staffName)) {
      db.staff.push(staffName);
    }

    // Attempt to automatically reduce matching item in Stockpile if applicable
    // e.g. if category is "PVC介護手袋" or names overlap, or toilet paper is withdrawn
    // Let's check matching by name or tags
    const matchingStockpile = db.stockpiles.find((s: any) => 
      s.name.toLowerCase().includes(product.category.toLowerCase()) ||
      product.name.toLowerCase().includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(product.name.toLowerCase())
    );
    if (matchingStockpile) {
      // Reduce the stockpile by quantity (min 0)
      matchingStockpile.currentStock = Math.max(0, matchingStockpile.currentStock - (Number(quantity) || 1));
      // Reset alertDismissed when stock drops below threshold again
      if (matchingStockpile.currentStock <= 1) {
        matchingStockpile.alertDismissed = false;
      }
    }

    await writeDatabase(db);
    res.json({ message: "Withdrawal recorded", withdrawal: newWithdrawal, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/withdrawals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, billedDate, billingMonth } = req.body;
    const db = await readDatabase();
    const idx = db.withdrawals.findIndex((w: any) => w.id === id);
    if (idx !== -1) {
      if (status !== undefined) db.withdrawals[idx].status = status;
      if (billedDate !== undefined) db.withdrawals[idx].billedDate = billedDate;
      if (billingMonth !== undefined) db.withdrawals[idx].billingMonth = billingMonth;
      await writeDatabase(db);
      return res.json({ message: "Withdrawal updated", data: db });
    }
    res.status(404).json({ error: "Withdrawal not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/withdrawals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDatabase();
    
    // Restore product stock when a withdrawal is deleted
    const withdrawal = db.withdrawals.find((w: any) => w.id === id);
    if (withdrawal) {
      const prod = db.products.find((p: any) => p.id === withdrawal.productId);
      if (prod) {
        if (prod.currentStock !== undefined) {
          prod.currentStock += (withdrawal.quantity || 1);
        } else {
          prod.currentStock = withdrawal.quantity || 1;
        }
      }
    }

    db.withdrawals = db.withdrawals.filter((w: any) => w.id !== id);
    await writeDatabase(db);
    res.json({ message: "Withdrawal deleted", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/withdrawals/clear", async (req, res) => {
  try {
    const db = await readDatabase();
    db.withdrawals = [];
    await writeDatabase(db);
    res.json({ message: "All withdrawals cleared", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Products API
app.post("/api/products", async (req, res) => {
  try {
    const { maker, category, name, capacity, size, priceInclTax, currentStock } = req.body;
    const db = await readDatabase();
    const stockVal = currentStock !== undefined ? (Number(currentStock) || 0) : 10; // Default to 10 if not specified (e.g. from template/imports)

    const prices = calculatePrices(Number(priceInclTax) || 0);

    // Normalize and check for duplicate
    const cleanMaker = (maker || "").trim();
    const cleanCategory = (category || "").trim();
    const cleanName = (name || "").trim();
    const cleanCapacity = (capacity || "-").trim();
    const cleanSize = (size || "-").trim();

    const existingIndex = db.products.findIndex((p: any) => 
      (p.maker || "").trim().toLowerCase() === cleanMaker.toLowerCase() &&
      (p.category || "").trim().toLowerCase() === cleanCategory.toLowerCase() &&
      (p.name || "").trim().toLowerCase() === cleanName.toLowerCase() &&
      (p.capacity || "-").trim().toLowerCase() === cleanCapacity.toLowerCase() &&
      (p.size || "-").trim().toLowerCase() === cleanSize.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Exist! Update its price and add to its stock
      db.products[existingIndex].priceInclTax = Number(priceInclTax) || 0;
      db.products[existingIndex].priceExclTax = prices.priceExclTax;
      db.products[existingIndex].sellingPrice = prices.sellingPrice;
      db.products[existingIndex].currentStock = (db.products[existingIndex].currentStock || 0) + stockVal;
      await writeDatabase(db);
      return res.json({ message: "Product updated", product: db.products[existingIndex], data: db });
    }

    const newProduct = {
      id: "p_" + Math.random().toString(36).substring(2, 11),
      maker: cleanMaker,
      category: cleanCategory,
      name: cleanName,
      capacity: cleanCapacity,
      size: cleanSize,
      priceInclTax: Number(priceInclTax) || 0,
      priceExclTax: prices.priceExclTax,
      sellingPrice: prices.sellingPrice,
      currentStock: stockVal
    };

    db.products.push(newProduct);
    await writeDatabase(db);
    res.json({ message: "Product added", product: newProduct, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { maker, category, name, capacity, size, priceInclTax, currentStock, syncWithBcp } = req.body;
    const db = await readDatabase();
    const idx = db.products.findIndex((p: any) => p.id === id);
    if (idx !== -1) {
      const oldName = db.products[idx].name;
      const oldCategory = db.products[idx].category;

      if (maker !== undefined) db.products[idx].maker = maker;
      if (category !== undefined) db.products[idx].category = category;
      if (name !== undefined) db.products[idx].name = name;
      if (capacity !== undefined) db.products[idx].capacity = capacity;
      if (size !== undefined) db.products[idx].size = size;
      if (currentStock !== undefined) db.products[idx].currentStock = Number(currentStock);
      if (priceInclTax !== undefined) {
        db.products[idx].priceInclTax = Number(priceInclTax) || 0;
        const prices = calculatePrices(Number(priceInclTax) || 0);
        db.products[idx].priceExclTax = prices.priceExclTax;
        db.products[idx].sellingPrice = prices.sellingPrice;
      }

      // Sync stockpile (BCP) stock if selected
      if (syncWithBcp && currentStock !== undefined) {
        const searchNames = [
          (name || "").toLowerCase(),
          (oldName || "").toLowerCase(),
          (category || "").toLowerCase(),
          (oldCategory || "").toLowerCase()
        ];
        
        db.stockpiles.forEach((s: any) => {
          const sName = (s.name || "").toLowerCase();
          // Check if there's any partial overlap to find the matching BCP item
          const isMatch = searchNames.some(n => n && (sName.includes(n) || n.includes(sName)));
          if (isMatch) {
            s.currentStock = Number(currentStock);
            s.alertDismissed = false; // Reset alert dismiss state
          }
        });
      }

      await writeDatabase(db);
      return res.json({ message: "Product updated", data: db });
    }
    res.status(404).json({ error: "Product not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDatabase();
    db.products = db.products.filter((p: any) => p.id !== id);
    await writeDatabase(db);
    res.json({ message: "Product deleted", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stockpiles API
app.post("/api/stockpiles", async (req, res) => {
  try {
    const { name, currentStock, requiredStock, unit, location, manager, notes } = req.body;
    const db = await readDatabase();

    const cleanName = (name || "").trim();
    const cleanLocation = (location || "倉庫").trim();

    // Check if an item with the exact same name and location already exists (case-insensitive)
    const existingIndex = db.stockpiles.findIndex((s: any) => 
      (s.name || "").trim().toLowerCase() === cleanName.toLowerCase() &&
      (s.location || "倉庫").trim().toLowerCase() === cleanLocation.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Exist! Merge currentStock
      db.stockpiles[existingIndex].currentStock += (Number(currentStock) || 0);
      if (Number(requiredStock) > 0) {
        db.stockpiles[existingIndex].requiredStock = Number(requiredStock);
      }
      if (manager) db.stockpiles[existingIndex].manager = manager;
      if (notes) db.stockpiles[existingIndex].notes = notes;
      
      // Reset alert dismissed flag if stock is updated
      if (db.stockpiles[existingIndex].currentStock > 1) {
        db.stockpiles[existingIndex].alertDismissed = false;
      }

      await writeDatabase(db);
      return res.json({ message: "Stockpile item merged", stockpile: db.stockpiles[existingIndex], data: db });
    }

    const newStock = {
      id: "s_" + Math.random().toString(36).substring(2, 11),
      name: cleanName,
      currentStock: Number(currentStock) || 0,
      requiredStock: Number(requiredStock) || 0,
      unit: unit || "個",
      location: cleanLocation,
      manager: manager || "",
      notes: notes || "",
      alertDismissed: false
    };

    db.stockpiles.push(newStock);
    await writeDatabase(db);
    res.json({ message: "Stockpile item added", stockpile: newStock, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/stockpiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStock, requiredStock, alertDismissed, name, unit, location, manager, notes } = req.body;
    const db = await readDatabase();
    const idx = db.stockpiles.findIndex((s: any) => s.id === id);
    if (idx !== -1) {
      if (currentStock !== undefined) {
        db.stockpiles[idx].currentStock = Number(currentStock);
        // auto reset alertDismissed if we restock above 1
        if (Number(currentStock) > 1) {
          db.stockpiles[idx].alertDismissed = false;
        }
      }
      if (requiredStock !== undefined) db.stockpiles[idx].requiredStock = Number(requiredStock);
      if (alertDismissed !== undefined) db.stockpiles[idx].alertDismissed = Boolean(alertDismissed);
      if (name !== undefined) db.stockpiles[idx].name = name;
      if (unit !== undefined) db.stockpiles[idx].unit = unit;
      if (location !== undefined) db.stockpiles[idx].location = location;
      if (manager !== undefined) db.stockpiles[idx].manager = manager;
      if (notes !== undefined) db.stockpiles[idx].notes = notes;

      await writeDatabase(db);
      return res.json({ message: "Stockpile item updated", data: db });
    }
    res.status(404).json({ error: "Stockpile item not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/stockpiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await readDatabase();
    db.stockpiles = db.stockpiles.filter((s: any) => s.id !== id);
    await writeDatabase(db);
    res.json({ message: "Stockpile item deleted", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Staff/BCP Withdrawals APIs
app.get("/api/staff-withdrawals", async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.staffWithdrawals || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff-withdrawals", async (req, res) => {
  try {
    const { office, category, itemName, quantity, staffName, date } = req.body;
    if (!office || !category || !itemName || !staffName) {
      return res.status(400).json({ error: "Office, category, itemName, and staffName are required." });
    }
    const db = await readDatabase();
    const qty = Number(quantity) || 1;

    // Normalize input itemName to match stockpile items fuzzy
    const normInput = normalizeName(itemName);
    let matchingStockpile = db.stockpiles.find((s: any) => normalizeName(s.name) === normInput);

    if (!matchingStockpile) {
      // Fallback 1: try if stockpile name contains input or vice versa
      matchingStockpile = db.stockpiles.find((s: any) => {
        const sNorm = normalizeName(s.name);
        return sNorm.includes(normInput) || normInput.includes(sNorm);
      });
    }

    if (matchingStockpile) {
      matchingStockpile.currentStock = Math.max(0, matchingStockpile.currentStock - qty);
      if (matchingStockpile.currentStock <= 1) {
        matchingStockpile.alertDismissed = false;
      }
    } else {
      console.warn(`[Staff Withdrawal Warning] No stockpile matches name: ${itemName} (${normInput})`);
    }

    const withdrawDate = date || new Date().toISOString().replace("T", " ").substring(0, 16);
    const newStaffWithdrawal = {
      id: "sw_" + Math.random().toString(36).substring(2, 11),
      date: withdrawDate,
      office,
      category,
      itemName,
      quantity: qty,
      staffName
    };

    if (!db.staffWithdrawals) {
      db.staffWithdrawals = [];
    }
    db.staffWithdrawals.unshift(newStaffWithdrawal);

    // Auto-save staff to staff list if new
    if (staffName && !db.staff.includes(staffName)) {
      db.staff.push(staffName);
    }

    await writeDatabase(db);
    res.json({
      message: "Staff withdrawal registered",
      staffWithdrawal: newStaffWithdrawal,
      data: db
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users and Staff Lists
app.post("/api/users", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const cleanName = name.endsWith("様") ? name : `${name} 様`;
    const db = await readDatabase();
    if (!db.users.includes(cleanName)) {
      db.users.push(cleanName);
      await writeDatabase(db);
    }
    res.json({ message: "User added", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const db = await readDatabase();
    if (!db.staff.includes(name)) {
      db.staff.push(name);
      await writeDatabase(db);
    }
    res.json({ message: "Staff added", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users/delete", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const db = await readDatabase();
    db.users = db.users.filter((u: any) => u !== name);
    await writeDatabase(db);
    res.json({ message: "User deleted", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff/delete", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const db = await readDatabase();
    db.staff = db.staff.filter((s: any) => s !== name);
    await writeDatabase(db);
    res.json({ message: "Staff deleted", data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Import endpoints
app.post("/api/import/products", async (req, res) => {
  try {
    const { tsvText } = req.body;
    if (!tsvText || typeof tsvText !== "string") {
      return res.status(400).json({ error: "TSV text is required" });
    }

    const lines = tsvText.split(/\r?\n/);
    const db = await readDatabase();
    let importedCount = 0;

    // Default indices (old hardcoded format)
    let makerIdx = 1;
    let categoryIdx = 2;
    let nameIdx = 3;
    let capacityIdx = 4;
    let sizeIdx = 5;
    let priceIdx = 6;
    let stockIdx = -1;

    // Smart Header Auto-Detection
    if (lines.length > 0) {
      const firstLineParts = lines[0].split("\t").map(p => p.trim());
      const hasMaker = firstLineParts.some(p => p.includes("メーカー"));
      const hasName = firstLineParts.some(p => p.includes("商品名") || p.includes("品名"));
      
      if (hasMaker || hasName) {
        firstLineParts.forEach((part, idx) => {
          if (part.includes("メーカー")) makerIdx = idx;
          else if (part.includes("品目") || part.includes("カテゴリ")) categoryIdx = idx;
          else if (part.includes("商品名") || part.includes("品名")) nameIdx = idx;
          else if (part.includes("容量") || part.includes("枚数")) capacityIdx = idx;
          else if (part.includes("サイズ")) sizeIdx = idx;
          else if (part.includes("金額") || part.includes("税込") || part.includes("価格")) priceIdx = idx;
          else if (part.includes("在庫") || part.includes("数量") || part.includes("初期在庫") || part.includes("個数")) stockIdx = idx;
        });
      }
    }

    for (let line of lines) {
      const parts = line.split("\t").map(p => p.trim());
      if (parts.length < 4 || parts[0] === "" || parts[0].includes("注文日") || parts[0].includes("メーカー") || parts[1].includes("メーカー") || parts[2].includes("品目") || parts[3].includes("商品名")) {
        continue; // Skip headers or empty lines
      }

      const maker = parts[makerIdx] || "その他";
      const category = parts[categoryIdx] || "未分類";
      const name = parts[nameIdx] || "不明な商品";
      const capacity = parts[capacityIdx] || "-";
      const size = parts[sizeIdx] || "-";
      
      const priceInclTaxStr = parts[priceIdx] ? parts[priceIdx].replace(/[,¥\s]/g, "") : "0";
      const priceInclTax = Number(priceInclTaxStr) || 0;

      // Extract currentStock if stockIdx was found, otherwise check if they appended an 8th column
      let currentStock = 10; // Default stock if none found
      if (stockIdx !== -1 && parts[stockIdx] !== undefined) {
        currentStock = Number(parts[stockIdx].replace(/[^0-9]/g, "")) || 0;
      } else if (parts.length > 7 && !isNaN(Number(parts[7].replace(/[^0-9]/g, "")))) {
        currentStock = Number(parts[7].replace(/[^0-9]/g, "")) || 0;
      }

      const prices = calculatePrices(priceInclTax);

      // Check for exact duplicate inside products DB to avoid multiplying identical entries
      const cleanMaker = maker.trim();
      const cleanCategory = category.trim();
      const cleanName = name.trim();
      const cleanCapacity = capacity.trim();
      const cleanSize = size.trim();

      const existingIndex = db.products.findIndex((p: any) => 
        (p.maker || "").trim().toLowerCase() === cleanMaker.toLowerCase() &&
        (p.category || "").trim().toLowerCase() === cleanCategory.toLowerCase() &&
        (p.name || "").trim().toLowerCase() === cleanName.toLowerCase() &&
        (p.capacity || "-").trim().toLowerCase() === cleanCapacity.toLowerCase() &&
        (p.size || "-").trim().toLowerCase() === cleanSize.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Exists: Overwrite or update prices and add/merge stock count
        db.products[existingIndex].priceInclTax = priceInclTax;
        db.products[existingIndex].priceExclTax = prices.priceExclTax;
        db.products[existingIndex].sellingPrice = prices.sellingPrice;
        db.products[existingIndex].currentStock = (db.products[existingIndex].currentStock || 0) + currentStock;
      } else {
        // New: Add to db
        db.products.push({
          id: "p_" + Math.random().toString(36).substring(2, 11),
          maker: cleanMaker,
          category: cleanCategory,
          name: cleanName,
          capacity: cleanCapacity,
          size: cleanSize,
          priceInclTax,
          priceExclTax: prices.priceExclTax,
          sellingPrice: prices.sellingPrice,
          currentStock
        });
      }
      importedCount++;
    }

    await writeDatabase(db);
    res.json({ message: `Successfully imported/updated ${importedCount} products.`, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/import/withdrawals", async (req, res) => {
  try {
    const { tsvText } = req.body;
    if (!tsvText || typeof tsvText !== "string") {
      return res.status(400).json({ error: "TSV text is required" });
    }

    const lines = tsvText.split(/\r?\n/);
    const db = await readDatabase();
    let importedCount = 0;

    // Expected Excel columns (from screenshot 1):
    // 購入日	購入先	品目	メーカー	枚数	品名	販売価格	販売日	請求月	請求	提供利用者名
    for (let line of lines) {
      const parts = line.split("\t").map(p => p.trim());
      if (parts.length < 5 || parts[0] === "" || parts[0].includes("購入日") || parts[2].includes("品目")) {
        continue; // Skip headers or empty lines
      }

      // Column Map:
      // parts[0]: 購入日 (purchaseDate)
      // parts[1]: 購入先 (supplier)
      // parts[2]: 品目 (category)
      // parts[3]: メーカー (maker)
      // parts[4]: 枚数/数量 (quantity/capacity in pack)
      // parts[5]: 品名/商品名 (name)
      // parts[6]: 販売価格/税込金額 (sellingPrice or priceInclTax)
      // parts[7]: 販売日 (soldDate / withdrawal date)
      // parts[8]: 請求月 (billingMonth, e.g. "4月")
      // parts[9]: 請求 (billing status, e.g. "済" or "未")
      // parts[10]: 提供利用者名 (recipient user name)

      const category = parts[2];
      const maker = parts[3];
      const quantityStr = parts[4] ? parts[4].replace(/[,枚回個袋箱\s]/g, "") : "30";
      const capacityPack = quantityStr + "枚";
      const name = parts[5];
      const sellingPriceStr = parts[6] ? parts[6].replace(/[,¥\s]/g, "") : "0";
      const sellingPriceValue = Number(sellingPriceStr) || 0;
      
      // Date of actual withdrawal
      const soldDate = parts[7] || parts[0] || new Date().toISOString().substring(5, 10); // e.g. "4/8" or "12/21"
      // Construct a standardized date for 2026 or parse it
      let formattedDate = "";
      if (soldDate.includes("/")) {
        const dateParts = soldDate.split("/");
        const year = dateParts[0].length === 4 ? dateParts[0] : "2026";
        const month = dateParts[0].length === 4 ? dateParts[1].padStart(2, "0") : dateParts[0].padStart(2, "0");
        const day = dateParts[0].length === 4 ? dateParts[2].padStart(2, "0") : dateParts[1].padStart(2, "0");
        formattedDate = `${year}-${month}-${day} 12:00`;
      } else {
        formattedDate = soldDate;
      }

      const rawBillingMonth = parts[8] ? parts[8].trim() : "";
      let billingMonthStr = "";
      const monthOnlyDigits = rawBillingMonth.replace(/[^0-9]/g, "");
      const monthVal = parseInt(monthOnlyDigits, 10);
      if (rawBillingMonth && !isNaN(monthVal) && monthVal >= 1 && monthVal <= 12) {
        billingMonthStr = `${monthVal}月`;
      } else {
        billingMonthStr = getBillingMonth(formattedDate);
      }
      const billingStatus = (parts[9] === "済" || parts[9] === "請求済") ? "billed" : "unbilled";
      const user = parts[10] || "未登録利用者";
      const cleanUser = user.endsWith("様") ? user : `${user} 様`;

      // Find if we have a matching product master or create on the fly
      let matchedProduct = db.products.find((p: any) => p.name === name);
      if (!matchedProduct) {
        // Compute reasonable cost prices backwards from the selling price
        // sellingPrice = taxExcl * 1.2 -> taxExcl = sellingPrice / 1.2
        // taxExcl = taxIncl / 1.1 -> taxIncl = taxExcl * 1.1
        const priceExclTax = Math.round(sellingPriceValue / 1.2);
        const priceInclTax = Math.round(priceExclTax * 1.1);
        matchedProduct = {
          id: "p_" + Math.random().toString(36).substring(2, 11),
          maker,
          category,
          name,
          capacity: capacityPack,
          size: "-",
          priceInclTax,
          priceExclTax,
          sellingPrice: sellingPriceValue
        };
        db.products.push(matchedProduct);
      }

      const newWithdrawal = {
        id: "w_" + Math.random().toString(36).substring(2, 11),
        date: formattedDate,
        userName: cleanUser,
        staffName: "インポート",
        productId: matchedProduct.id,
        product: matchedProduct,
        quantity: 1, // standard 1 package withdrawal
        billingMonth: billingMonthStr,
        status: billingStatus,
        billedDate: billingStatus === "billed" ? (formattedDate.split(" ")[0]) : null
      };

      db.withdrawals.unshift(newWithdrawal);

      // Auto-populate user list
      if (!db.users.includes(cleanUser)) {
        db.users.push(cleanUser);
      }

      importedCount++;
    }

    await writeDatabase(db);
    res.json({ message: `Successfully imported ${importedCount} purchase history entries.`, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/import/stockpiles", async (req, res) => {
  try {
    const { tsvText } = req.body;
    if (!tsvText || typeof tsvText !== "string") {
      return res.status(400).json({ error: "TSV text is required" });
    }

    const lines = tsvText.split(/\r?\n/);
    const db = await readDatabase();
    let importedCount = 0;

    for (let line of lines) {
      const parts = line.split("\t").map(p => p.trim());
      if (parts.length < 3 || parts[0] === "" || parts[0].includes("品目") || parts[0].includes("備蓄品名") || parts[0].includes("品名")) {
        continue; // Skip headers or empty lines
      }

      const name = parts[0];
      const currentStock = Number(parts[1]) || 0;
      const requiredStock = Number(parts[2]) || 0;
      const unit = parts[3] || "個";
      const location = parts[4] || "倉庫";
      const notes = parts[5] || "";

      // Update existing or push new
      const idx = db.stockpiles.findIndex((s: any) => s.name === name);
      if (idx !== -1) {
        db.stockpiles[idx].currentStock = currentStock;
        db.stockpiles[idx].requiredStock = requiredStock;
        db.stockpiles[idx].unit = unit;
        db.stockpiles[idx].location = location;
        db.stockpiles[idx].notes = notes;
      } else {
        db.stockpiles.push({
          id: "s_" + Math.random().toString(36).substring(2, 11),
          name,
          currentStock,
          requiredStock,
          unit,
          location,
          manager: "",
          notes,
          alertDismissed: false
        });
      }
      importedCount++;
    }

    await writeDatabase(db);
    res.json({ message: `Successfully imported ${importedCount} stockpile items.`, data: db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
