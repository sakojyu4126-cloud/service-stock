import React, { useState, useEffect, useRef } from "react";
import { 
  Package, 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Minus, 
  Trash2, 
  Edit,
  RefreshCw, 
  FileSpreadsheet, 
  Smartphone, 
  Monitor, 
  UserPlus, 
  Search, 
  SlidersHorizontal, 
  Check, 
  ArrowRightLeft, 
  Layers, 
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Product, Withdrawal, Stockpile, ActiveTab } from "./types";

export default function App() {
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [staff, setStaff] = useState<string[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>("helper");
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Form States - Helper Withdrawal 2
  const [helper2Office, setHelper2Office] = useState<string>("サ高住");
  const [helper2Category, setHelper2Category] = useState<string>("①衛生用品-1（日常業務用）");
  const [helper2ItemName, setHelper2ItemName] = useState<string>("");
  const [helper2Quantity, setHelper2Quantity] = useState<number>(1);
  const [helper2StaffInput, setHelper2StaffInput] = useState<string>(() => localStorage.getItem("momo_last_staff") || "");
  const [showHelper2StaffSuggestions, setShowHelper2StaffSuggestions] = useState(false);
  const [helper2WithdrawalSuccess, setHelper2WithdrawalSuccess] = useState<string | null>(null);
  const [helper2WithdrawDate, setHelper2WithdrawDate] = useState("");
  const [staffWithdrawals, setStaffWithdrawals] = useState<any[]>([]);

  // Filter States (Billing Screen)
  const [billingMonthFilter, setBillingMonthFilter] = useState<string>("全て");
  const [billingUserFilter, setBillingUserFilter] = useState<string>("全て");
  const [billingStatusFilter, setBillingStatusFilter] = useState<string>("未請求");
  const [billingSearchQuery, setBillingSearchQuery] = useState("");
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  const [hideBilledItems, setHideBilledItems] = useState(false);

  // Filter States (Stockpile Screen)
  const [stockpileSearchQuery, setStockpileSearchQuery] = useState("");
  const [stockpileAlertOnly, setStockpileAlertOnly] = useState(false);

  // Form States - Helper Withdrawal (Dynamic autocomplete)
  const [userInput, setUserInput] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [staffInput, setStaffInput] = useState(() => localStorage.getItem("momo_last_staff") || "");
  const [showStaffSuggestions, setShowStaffSuggestions] = useState(false);

  // Suggestion History lists (saved and deleteable)
  const [deletedUsers, setDeletedUsers] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("momo_deleted_users") || "[]");
    } catch {
      return [];
    }
  });

  const [deletedStaff, setDeletedStaff] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("momo_deleted_staff") || "[]");
    } catch {
      return [];
    }
  });

  const savedUsers = users.filter(u => !deletedUsers.includes(u));
  const savedStaff = staff.filter(s => !deletedStaff.includes(s));

  // Refs for clicking outside suggestions
  const userRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const helper2StaffRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("①尿取りパット類");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [withdrawalQty, setWithdrawalQty] = useState(1);
  const [customWithdrawDate, setCustomWithdrawDate] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null);

  // Form States - Admin New Product
  const [newProdMaker, setNewProdMaker] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("尿取りパット類");
  const [newProdName, setNewProdName] = useState("");
  const [newProdCapacity, setNewProdCapacity] = useState("");
  const [newProdSize, setNewProdSize] = useState("");
  const [newProdPriceInclTax, setNewProdPriceInclTax] = useState<number | "">("");
  const [newProdCurrentStock, setNewProdCurrentStock] = useState<number | "">(10);
  const [stockSubTab, setStockSubTab] = useState<"bcp" | "diaper">("bcp");

  // Form States - Admin New Stockpile
  const [newStockName, setNewStockName] = useState("");
  const [newStockQty, setNewStockQty] = useState<number | "">("");
  const [newStockRequired, setNewStockRequired] = useState<number | "">("");
  const [newStockUnit, setNewStockUnit] = useState("個");
  const [newStockLocation, setNewStockLocation] = useState("5番館倉庫");
  const [newStockManager, setNewStockManager] = useState("");
  const [newStockNotes, setNewStockNotes] = useState("");

  // Excel Import UI Toggle
  const [activeImportType, setActiveImportType] = useState<"products" | "withdrawals" | "stockpiles" | null>(null);
  const [importTsvText, setImportTsvText] = useState("");
  const [importFeedback, setImportFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Quick Help state
  const [showHelp, setShowHelp] = useState(false);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "確定する") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Load and refresh logic
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsSyncing(true);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("データの取得に失敗しました");
      const data = await res.json();
      setProducts(data.products || []);
      setWithdrawals(data.withdrawals || []);
      setStockpiles(data.stockpiles || []);
      setUsers(data.users || []);
      setStaff(data.staff || []);
      setStaffWithdrawals(data.staffWithdrawals || []);
      
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Poll database every 10 seconds for real-time synchronization between helper phone and office PC
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close suggestion dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserSuggestions(false);
      }
      if (staffRef.current && !staffRef.current.contains(event.target as Node)) {
        setShowStaffSuggestions(false);
      }
      if (helper2StaffRef.current && !helper2StaffRef.current.contains(event.target as Node)) {
        setShowHelper2StaffSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const helper2Categories: Record<string, string[]> = {
    "①衛生用品-1（日常業務用）": [
      "PVC使い捨て手袋S",
      "PVC使い捨て手袋M",
      "PVC使い捨て手袋L",
      "流せるお尻拭き",
      "次亜塩素酸ナトリウム（12％）",
      "消毒用アルコール（10L）",
      "消毒用アルコール（スプレー）",
      "消毒用アルコール（5L）"
    ],
    "②衛生用品-2（BCP感染症対策）": [
      "抗原検査キット",
      "マスク（N95高機能マスク）",
      "マスク（不織布）",
      "体温計（腋下）",
      "体温計（非接触型）",
      "パルスオキシメーター",
      "アルコール綿（個包装）",
      "ガーゼ類",
      "ガウン（薄手）",
      "ガウン（厚手）",
      "フェイスシールド",
      "ゴーグル",
      "キャップ",
      "紙コップ",
      "使い捨て食器（飯碗用）",
      "使い捨て食器（汁物用）",
      "使い捨て食器（弁当スタイル）",
      "使い捨て食器（丼用）"
    ],
    "③消耗品類（洗剤など）": [
      "中性洗剤（厨房用）",
      "中性洗剤（強力）",
      "ゴミ袋 大（45L）",
      "ゴミ袋 中（30L）",
      "薬用ハンドソープ（5L）",
      "手指消毒ジェル",
      "ハイター",
      "ウタマロ",
      "トイレクリーナー液（5L）"
    ],
    "④デイサービス": [
      "シャンプー／リンス",
      "ボディソープ",
      "トイレットペーパー",
      "ハンドペーパー",
      "お風呂洗剤（4L）"
    ]
  };

  function normalizeName(name: string): string {
    if (!name) return "";
    return name
      .replace(/[\s　]+/g, "")
      .replace(/[（()）]/g, "")
      .replace(/[-ー]/g, "")
      .replace(/[a-zA-Z]/g, (l) => l.toLowerCase());
  }

  const getHelper2ItemStock = (itemName: string) => {
    const normName = normalizeName(itemName);
    const found = stockpiles.find(s => normalizeName(s.name) === normName);
    return found ? found.currentStock : 0;
  };

  const getHelper2ItemUnit = (itemName: string) => {
    const normName = normalizeName(itemName);
    const found = stockpiles.find(s => normalizeName(s.name) === normName);
    return found ? found.unit : "個";
  };

  useEffect(() => {
    const items = helper2Categories[helper2Category] || [];
    if (items.length > 0) {
      setHelper2ItemName(items[0]);
    } else {
      setHelper2ItemName("");
    }
  }, [helper2Category]);

  const deleteUserFromHistory = async (nameToDelete: string) => {
    setUsers(prev => prev.filter(u => u !== nameToDelete));
    setDeletedUsers(prev => {
      const next = [...prev.filter(u => u !== nameToDelete), nameToDelete];
      localStorage.setItem("momo_deleted_users", JSON.stringify(next));
      return next;
    });

    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToDelete })
      });
      if (res.ok) {
        const result = await res.json();
        setUsers(result.data.users);
      }
    } catch (err) {
      console.error("Failed to delete user on server", err);
    }
  };

  const deleteStaffFromHistory = async (nameToDelete: string) => {
    setStaff(prev => prev.filter(s => s !== nameToDelete));
    setDeletedStaff(prev => {
      const next = [...prev.filter(s => s !== nameToDelete), nameToDelete];
      localStorage.setItem("momo_deleted_staff", JSON.stringify(next));
      return next;
    });

    try {
      const res = await fetch("/api/staff/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToDelete })
      });
      if (res.ok) {
        const result = await res.json();
        setStaff(result.data.staff);
      }
    } catch (err) {
      console.error("Failed to delete staff on server", err);
    }
  };

  // Product Edit States & Handlers
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProdCategory, setEditProdCategory] = useState("");
  const [editProdMaker, setEditProdMaker] = useState("");
  const [editProdName, setEditProdName] = useState("");
  const [editProdCapacity, setEditProdCapacity] = useState("");
  const [editProdSize, setEditProdSize] = useState("");
  const [editProdPriceInclTax, setEditProdPriceInclTax] = useState<number | "">("");
  const [editProdCurrentStock, setEditProdCurrentStock] = useState<number | "">("");
  const [syncWithBcp, setSyncWithBcp] = useState(true);

  const openEditModal = (prod: any) => {
    setEditingProduct(prod);
    setEditProdCategory(prod.category);
    setEditProdMaker(prod.maker);
    setEditProdName(prod.name);
    setEditProdCapacity(prod.capacity || "");
    setEditProdSize(prod.size || "");
    setEditProdPriceInclTax(prod.priceInclTax || 0);
    setEditProdCurrentStock(prod.currentStock !== undefined ? prod.currentStock : 0);
    setSyncWithBcp(true);
  };

  // Stockpile Edit States & Handlers
  const [editingStockpile, setEditingStockpile] = useState<Stockpile | null>(null);
  const [editStockName, setEditStockName] = useState("");
  const [editStockQty, setEditStockQty] = useState<number | "">("");
  const [editStockRequired, setEditStockRequired] = useState<number | "">("");
  const [editStockUnit, setEditStockUnit] = useState("個");
  const [editStockLocation, setEditStockLocation] = useState("");
  const [editStockNotes, setEditStockNotes] = useState("");

  const openStockpileEditModal = (stock: Stockpile) => {
    setEditingStockpile(stock);
    setEditStockName(stock.name);
    setEditStockQty(stock.currentStock);
    setEditStockRequired(stock.requiredStock);
    setEditStockUnit(stock.unit || "個");
    setEditStockLocation(stock.location || "");
    setEditStockNotes(stock.notes || "");
  };

  const handleUpdateStockpileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockpile) return;
    if (!editStockName || editStockQty === "" || editStockRequired === "") {
      alert("品名、備蓄量、必要量を入力してください。");
      return;
    }

    try {
      const res = await fetch(`/api/stockpiles/${editingStockpile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStockName,
          currentStock: Number(editStockQty),
          requiredStock: Number(editStockRequired),
          unit: editStockUnit,
          location: editStockLocation,
          notes: editStockNotes
        })
      });

      if (!res.ok) throw new Error("備蓄品の更新に失敗しました");
      const result = await res.json();
      setStockpiles(result.data.stockpiles);
      setEditingStockpile(null);
      alert("備蓄品の登録情報を変更しました！");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editProdMaker || !editProdName || editProdPriceInclTax === "" || editProdCurrentStock === "") {
      alert("メーカー、商品名、金額、現在庫数を入力してください。");
      return;
    }

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: editProdMaker,
          category: editProdCategory,
          name: editProdName,
          capacity: editProdCapacity,
          size: editProdSize,
          priceInclTax: Number(editProdPriceInclTax),
          currentStock: Number(editProdCurrentStock),
          syncWithBcp: syncWithBcp
        })
      });

      if (!res.ok) throw new Error("商品の更新に失敗しました");
      const result = await res.json();
      setProducts(result.data.products);
      setStockpiles(result.data.stockpiles);
      setEditingProduct(null);
      alert("商品の登録情報を変更し、在庫数も上書き更新しました！");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Pre-fill current local date
  useEffect(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISO = new Date(now.getTime() - tzOffset).toISOString().substring(0, 16);
    setCustomWithdrawDate(localISO);
    setHelper2WithdrawDate(localISO);
  }, []);

  // Handle Withdrawal Submission
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalUser = userInput.trim();
    const finalStaff = staffInput.trim();

    if (!finalUser) {
      alert("利用者名を入力してください。");
      return;
    }
    if (!finalStaff) {
      alert("担当ヘルパー名を入力してください。");
      return;
    }
    if (!selectedProductId) {
      alert("物品を選択してください。");
      return;
    }

    // Auto-append "様" if not present
    if (!finalUser.endsWith("様")) {
      finalUser = `${finalUser} 様`;
    }

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: finalUser,
          staffName: finalStaff,
          productId: selectedProductId,
          quantity: withdrawalQty,
          date: customWithdrawDate || null
        })
      });

      if (!res.ok) throw new Error("登録に失敗しました");
      const data = await res.json();
      
      // Save last staff name for next default load
      localStorage.setItem("momo_last_staff", finalStaff);

      // Update local states
      setWithdrawals(data.data.withdrawals);
      setStockpiles(data.data.stockpiles);
      setUsers(data.data.users);
      setStaff(data.data.staff);

      // Trigger success alert
      const matchedProd = products.find(p => p.id === selectedProductId);
      setWithdrawalSuccess(`「${matchedProd?.maker} ${matchedProd?.name}」を ${withdrawalQty} 個、${finalUser} 宛てに登録しました。倉庫在庫も自動調整されました。`);
      
      // Reset some fields (Keep staffName filled for consecutive inputs, clear userName)
      setWithdrawalQty(1);
      setUserInput("");
      
      // Refresh current local time
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().substring(0, 16);
      setCustomWithdrawDate(localISO);
      
      // Clear message after 4 seconds
      setTimeout(() => {
        setWithdrawalSuccess(null);
      }, 4000);

    } catch (err: any) {
      alert(err.message || "エラーが発生しました");
    }
  };

  // Handle Helper 2 (Staff/BCP) Withdrawal Submission
  const handleHelper2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalStaff = helper2StaffInput.trim();

    if (!helper2ItemName) {
      alert("品目を選択してください。");
      return;
    }
    if (!finalStaff) {
      alert("出庫担当者名を入力してください。");
      return;
    }

    try {
      const res = await fetch("/api/staff-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          office: helper2Office,
          category: helper2Category,
          itemName: helper2ItemName,
          quantity: helper2Quantity,
          staffName: finalStaff,
          date: helper2WithdrawDate || null
        })
      });

      if (!res.ok) throw new Error("登録に失敗しました");
      const result = await res.json();

      // Save last staff name
      localStorage.setItem("momo_last_staff", finalStaff);
      setStaffInput(finalStaff); // sync with Tab 1

      // Update local states
      setStockpiles(result.data.stockpiles);
      setStaff(result.data.staff);
      setStaffWithdrawals(result.data.staffWithdrawals || []);

      setHelper2WithdrawalSuccess(`「${helper2ItemName}」を ${helper2Quantity} ${getHelper2ItemUnit(helper2ItemName)}、${helper2Office}宛てに登録しました。在庫数も自動的にマイナスされました。`);
      setHelper2Quantity(1);

      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().substring(0, 16);
      setHelper2WithdrawDate(localISO);

      setTimeout(() => {
        setHelper2WithdrawalSuccess(null);
      }, 4000);

    } catch (err: any) {
      alert(err.message || "エラーが発生しました");
    }
  };

  // Toggle Billing Status
  const handleToggleBilling = async (id: string, currentStatus: "billed" | "unbilled") => {
    const nextStatus = currentStatus === "unbilled" ? "billed" : "unbilled";
    const todayStr = nextStatus === "billed" ? new Date().toISOString().substring(0, 10) : null;
    
    try {
      const res = await fetch(`/api/withdrawals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, billedDate: todayStr })
      });
      if (!res.ok) throw new Error("ステータスの変更に失敗しました");
      const result = await res.json();
      setWithdrawals(result.data.withdrawals);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bulk Billing Action
  const handleBulkBilling = async () => {
    if (selectedWithdrawals.length === 0) return;
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      for (let id of selectedWithdrawals) {
        await fetch(`/api/withdrawals/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "billed", billedDate: todayStr })
        });
      }
      setSelectedWithdrawals([]);
      await fetchData();
    } catch (err) {
      alert("一括更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Withdrawal entry
  const handleDeleteWithdrawal = (id: string) => {
    showConfirm(
      "払い出し履歴の削除",
      "この払い出し履歴を完全に削除しますか？ (倉庫の在庫数は自動で戻りません。必要に応じて備蓄管理画面で手動で調整してください)",
      async () => {
        try {
          const res = await fetch(`/api/withdrawals/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("削除に失敗しました");
          const result = await res.json();
          setWithdrawals(result.data.withdrawals);
        } catch (err: any) {
          alert(err.message);
        }
      },
      "削除する"
    );
  };

  // Clear all withdrawals history
  const handleClearWithdrawals = () => {
    showConfirm(
      "請求対象者・払い出し履歴の全削除",
      "未登録利用者などを含め、現在登録されているすべての払い出し履歴（請求管理対象データ）を完全に削除します。この操作は取り消せません。よろしいですか？",
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/withdrawals/clear", { method: "POST" });
          if (!res.ok) throw new Error("履歴の削除に失敗しました");
          const result = await res.json();
          setWithdrawals(result.data.withdrawals || []);
          setSelectedWithdrawals([]);
          alert("すべての払い出し履歴（請求対象者）を消去しました。");
        } catch (err: any) {
          alert(err.message);
        } finally {
          setIsLoading(false);
        }
      },
      "すべて消去する"
    );
  };

  // Quick In-place Stockpile Edit (+/-)
  const handleStockAdjust = async (id: string, currentVal: number, change: number) => {
    const newVal = Math.max(0, currentVal + change);
    try {
      const res = await fetch(`/api/stockpiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: newVal })
      });
      if (!res.ok) throw new Error("在庫数の更新に失敗しました");
      const result = await res.json();
      setStockpiles(result.data.stockpiles);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Direct In-place Stockpile Edit (Direct Input Overwrite)
  const handleStockSet = async (id: string, newVal: number) => {
    const val = Math.max(0, newVal);
    try {
      const res = await fetch(`/api/stockpiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: val })
      });
      if (!res.ok) throw new Error("在庫数の更新に失敗しました");
      const result = await res.json();
      setStockpiles(result.data.stockpiles);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Dismiss/Mute Stockpile alert
  const handleDismissAlert = async (id: string, currentMuted: boolean) => {
    try {
      const res = await fetch(`/api/stockpiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertDismissed: !currentMuted })
      });
      if (!res.ok) throw new Error("アラート状態の更新に失敗しました");
      const result = await res.json();
      setStockpiles(result.data.stockpiles);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Adjust product catalog stock count (diaper hygiene product stock)
  const handleProductStockAdjust = async (id: string, currentStock: number, diff: number) => {
    const nextStock = Math.max(0, currentStock + diff);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: nextStock })
      });
      if (!res.ok) throw new Error("在庫数の更新に失敗しました");
      const result = await res.json();
      setProducts(result.data.products);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Direct In-place Product Stock Edit (Direct Input Overwrite)
  const handleProductStockSet = async (id: string, val: number) => {
    const nextStock = Math.max(0, val);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: nextStock })
      });
      if (!res.ok) throw new Error("在庫数の更新に失敗しました");
      const result = await res.json();
      setProducts(result.data.products);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit new product catalog entry
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdMaker || !newProdName || !newProdPriceInclTax) {
      alert("メーカー、商品名、金額を入力してください。");
      return;
    }
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker: newProdMaker,
          category: newProdCategory,
          name: newProdName,
          capacity: newProdCapacity,
          size: newProdSize,
          priceInclTax: Number(newProdPriceInclTax),
          currentStock: Number(newProdCurrentStock) || 0
        })
      });
      if (!res.ok) throw new Error("商品の追加に失敗しました");
      const result = await res.json();
      setProducts(result.data.products);
      
      // Reset form
      setNewProdMaker("");
      setNewProdName("");
      setNewProdCapacity("");
      setNewProdSize("");
      setNewProdPriceInclTax("");
      setNewProdCurrentStock(10);
      alert("商品マスターに新しい商品を追加しました！");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete product catalog entry
  const handleDeleteProduct = (id: string) => {
    showConfirm(
      "商品マスタから削除",
      "この商品をマスタから完全に削除しますか？ (登録済みの払い出し履歴には影響しません)",
      async () => {
        try {
          const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("削除に失敗しました");
          const result = await res.json();
          setProducts(result.data.products);
        } catch (err: any) {
          alert(err.message);
        }
      },
      "削除する"
    );
  };

  // Submit new stockpile item
  const handleAddStockpile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName || newStockQty === "" || newStockRequired === "") {
      alert("備蓄品名、備蓄量、必要量を入力してください。");
      return;
    }
    try {
      const res = await fetch("/api/stockpiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStockName,
          currentStock: Number(newStockQty),
          requiredStock: Number(newStockRequired),
          unit: newStockUnit,
          location: newStockLocation,
          manager: newStockManager,
          notes: newStockNotes
        })
      });
      if (!res.ok) throw new Error("備蓄品の追加に失敗しました");
      const result = await res.json();
      setStockpiles(result.data.stockpiles);

      // Reset form
      setNewStockName("");
      setNewStockQty("");
      setNewStockRequired("");
      setNewStockManager("");
      setNewStockNotes("");
      alert("備蓄品（BCP）リストに新しいアイテムを追加しました！");
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete stockpile item
  const handleDeleteStockpile = (id: string) => {
    showConfirm(
      "備蓄品リストから削除",
      "この備蓄品（BCP備蓄）をリストから完全に削除しますか？",
      async () => {
        try {
          const res = await fetch(`/api/stockpiles/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("削除に失敗しました");
          const result = await res.json();
          setStockpiles(result.data.stockpiles);
        } catch (err: any) {
          alert(err.message);
        }
      },
      "削除する"
    );
  };

  // TSV Excel Import Logic
  const handleExcelImport = async () => {
    if (!importTsvText.trim()) {
      setImportFeedback({ type: "error", message: "貼り付けテキストが空です。Excelからコピーして貼り付けてください。" });
      return;
    }
    setIsLoading(true);
    setImportFeedback(null);
    try {
      let endpoint = "/api/import/withdrawals";
      if (activeImportType === "products") {
        endpoint = "/api/import/products";
      } else if (activeImportType === "stockpiles") {
        endpoint = "/api/import/stockpiles";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tsvText: importTsvText })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "インポート中にエラーが発生しました");

      if (activeImportType === "stockpiles") {
        setStockpiles(result.data.stockpiles || []);
      } else {
        setProducts(result.data.products || []);
        setWithdrawals(result.data.withdrawals || []);
        setUsers(result.data.users || []);
        setStaff(result.data.staff || []);
      }

      setImportFeedback({
        type: "success",
        message: result.message || "インポートが正常に完了しました！"
      });
      setImportTsvText("");
    } catch (err: any) {
      setImportFeedback({ type: "error", message: err.message || "エラーが発生しました。" });
    } finally {
      setIsLoading(false);
    }
  };

  // Database Reset to template
  const handleResetDatabase = () => {
    showConfirm(
      "データベースの完全リセット",
      "データベースのすべての内容（追加商品、追加払い出し履歴、BCP在庫）を初期のサンプルデータにリセットしますか？この操作は取り消せません。",
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/reset", { method: "POST" });
          if (!res.ok) throw new Error("リセットに失敗しました");
          const result = await res.json();
          setProducts(result.data.products);
          setWithdrawals(result.data.withdrawals);
          setStockpiles(result.data.stockpiles);
          setUsers(result.data.users);
          setStaff(result.data.staff);
          alert("データベースを初期状態に復元しました。");
        } catch (err: any) {
          alert(err.message);
        } finally {
          setIsLoading(false);
        }
      },
      "リセットする"
    );
  };

  // Calculations & Filter Processing
  const filteredProductsByCategory = products.filter(p => {
    const categoryClean = selectedCategory.replace(/^[①-⑤]/, ""); // remove lead number
    return p.category === categoryClean;
  });

  // Calculate unique billing months in DB (only include valid "X月" formats, filtering out garbage values like "676月" or prices)
  const uniqueMonths = (Array.from(new Set(withdrawals.map(w => w.billingMonth))) as string[])
    .filter(m => m && m.endsWith("月") && m.length <= 4)
    .sort((a, b) => {
      const aNum = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
      const bNum = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0;
      return bNum - aNum; // Descending order: 12月 down to 1月
    });

  // Calculate unique billing users in DB
  const uniqueBillingUsers = (Array.from(new Set(withdrawals.map(w => w.userName))) as string[])
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    // Billing Month filter
    if (billingMonthFilter !== "全て" && w.billingMonth !== billingMonthFilter) return false;

    // User filter
    if (billingUserFilter !== "全て" && w.userName !== billingUserFilter) return false;
    
    // Status filter
    if (billingStatusFilter !== "全て") {
      const mappedStatus = billingStatusFilter === "未請求" ? "unbilled" : "billed";
      if (w.status !== mappedStatus) return false;
    }

    // Custom hide billed toggle
    if (hideBilledItems && w.status === "billed") return false;

    // Search query
    if (billingSearchQuery) {
      const q = billingSearchQuery.toLowerCase();
      const matchUser = w.userName.toLowerCase().includes(q);
      const matchStaff = w.staffName.toLowerCase().includes(q);
      const matchProduct = w.product.name.toLowerCase().includes(q) || w.product.maker.toLowerCase().includes(q);
      return matchUser || matchStaff || matchProduct;
    }

    return true;
  });

  // Filter stockpiles
  const filteredStockpiles = stockpiles.filter(s => {
    if (stockpileAlertOnly && s.currentStock > 1) return false;

    if (stockpileSearchQuery) {
      const q = stockpileSearchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchLoc = s.location.toLowerCase().includes(q);
      const matchNotes = s.notes.toLowerCase().includes(q);
      return matchName || matchLoc || matchNotes;
    }

    return true;
  });

  // Calculation for Unbilled Totals
  const unbilledWithdrawals = withdrawals.filter(w => w.status === "unbilled");
  const totalUnbilledCostInclTax = unbilledWithdrawals.reduce((sum, w) => sum + (w.product.priceInclTax * w.quantity), 0);
  const totalUnbilledCostExclTax = unbilledWithdrawals.reduce((sum, w) => sum + (w.product.priceExclTax * w.quantity), 0);
  const totalUnbilledSellingPrice = unbilledWithdrawals.reduce((sum, w) => sum + (w.product.sellingPrice * w.quantity), 0);
  const totalUnbilledProfit = totalUnbilledSellingPrice - totalUnbilledCostExclTax;

  // Stock alerts counter (where current stock <= 1 and alert is not dismissed)
  const activeStockAlertsCount = stockpiles.filter(s => s.currentStock <= 1 && !s.alertDismissed).length;

  // Diaper stock alerts counter (where current stock <= 2)
  const activeDiaperAlertsCount = products.filter(p => p.currentStock !== undefined && p.currentStock <= 2).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col antialiased">
      
      {/* Top Professional Header Bar */}
      <header className="bg-lime-500 text-slate-900 shadow-sm border-b border-lime-600 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900/10 p-2 rounded-lg border border-slate-900/20">
              <Package className="h-6 w-6 text-slate-900" id="header-logo-icon" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight font-display flex items-center gap-2 text-slate-950">
                衛生用品＆備蓄　在庫管理
              </h1>
              <p className="text-xs text-slate-800 font-bold">
                桃の郷 京都東山
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Quick reset */}
            <button
              onClick={handleResetDatabase}
              className="bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 px-3 py-1.5 rounded-full border border-slate-900/20 transition text-xs font-bold"
            >
              初期化
            </button>

            {/* Help Toggle */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 px-3 py-1.5 rounded-full border border-slate-900/20 transition text-xs font-bold flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              ヘルプ
            </button>
          </div>

        </div>
      </header>

      {/* Quick Help Information Block */}
      {showHelp && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 text-sm text-emerald-800 shrink-0">
          <div className="max-w-7xl mx-auto flex gap-3 items-start">
            <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">【このアプリについて】</p>
              <p className="mb-2 leading-relaxed">
                このシステムは、事業所内の物品、備品、衛生用品の管理をペーパーレス化し、スマートフォンとPCでの完全なリアルタイム同期を実現します。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-700">
                <li><strong>📱 ヘルパー画面：</strong> 倉庫で衛生用品を払い出す際に、利用者様名と自分の名前を選び、カテゴリー（①〜⑤）から対象商品を選択して即座に登録します。（販売金額は表示されません）</li>
                <li><strong>💻 請求管理画面：</strong> ヘルパーが払い出した品が一覧になり、毎月15日の締め日に応じて自動で「対象請求月」が割り振られます。未請求/請求済の管理が行え、販売価格（税抜の2割増）は請求処理後にワンクリックで非表示（消去）にできます。</li>
                <li><strong>📦 備蓄管理(BCP)画面：</strong> トイレットペーパーやマスクなどのオフィス備蓄をリスト化し、在庫が「残1」になるとアラートを表示。発注を他スタッフへ共有し解除できます。</li>
                <li><strong>📋 Excelインポート：</strong> Amazonなどのネット購入履歴（注文表）や商品マスタのスプレッドシートを、コピー＆ペースト（TSV形式）で一瞬で一括登録できます。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Role and Screen Selector Tabs */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            
            <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
              
              <button
                onClick={() => setActiveTab("helper")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${
                  activeTab === "helper"
                    ? "bg-pink-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="tab-btn-helper"
              >
                <Smartphone className="h-4 w-4" />
                スマホ出庫①
              </button>

              <button
                onClick={() => setActiveTab("helper2")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all ${
                  activeTab === "helper2"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="tab-btn-helper2"
              >
                <Smartphone className="h-4 w-4" />
                スマホ出庫②
              </button>

              <button
                onClick={() => setActiveTab("billing")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all relative ${
                  activeTab === "billing"
                    ? "bg-lime-500 text-slate-950 font-extrabold shadow-sm border border-lime-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="tab-btn-billing"
              >
                <Monitor className="h-4 w-4" />
                請求管理
                {unbilledWithdrawals.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                    {unbilledWithdrawals.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("stockpile")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all relative ${
                  activeTab === "stockpile"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                id="tab-btn-stockpile"
              >
                <Layers className="h-4 w-4" />
                在庫管理
                {(activeStockAlertsCount + activeDiaperAlertsCount) > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse">
                    {activeStockAlertsCount + activeDiaperAlertsCount}
                  </span>
                )}
              </button>

            </div>

          </div>
        </div>
      </nav>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-3">
              <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" />
              <span className="text-sm font-medium text-slate-700">データを読み込み中...</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 📱: Helper Withdrawal Screen 
            ========================================================================= */}
        {activeTab === "helper" && (
          <div className="max-w-2xl mx-auto">
            
            {/* Visual Simulator Frame for Desktop Testing */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              
              {/* Fake Mobile Screen Header */}
              <div className="bg-slate-900 text-slate-200 px-6 py-4 flex justify-between items-center border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-pink-400" />
                  <span className="text-xs font-mono tracking-widest text-slate-300">HELPER TERMINAL</span>
                </div>
                <div className="text-[11px] bg-pink-500 text-white px-2.5 py-1 rounded-full font-bold">
                  かんたん出庫管理
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                
                {/* Withdrawal Success Alert Toast */}
                {withdrawalSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">払い出し登録完了</p>
                      <p className="text-xs text-emerald-700 mt-1">{withdrawalSuccess}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleWithdrawalSubmit} className="space-y-6">
                  
                  {/* Date Input - MOVED TO TOP */}
                  <div className="space-y-2 p-3 bg-pink-50/40 rounded-xl border border-pink-100">
                    <label className="block text-xs font-bold text-slate-600">
                      出庫日時（自動設定）
                    </label>
                    <input
                      type="datetime-local"
                      value={customWithdrawDate}
                      onChange={(e) => setCustomWithdrawDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white font-mono focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  {/* 1. Recipient User Input (Prediction and Autocomplete) */}
                  <div className="space-y-2 relative" ref={userRef}>
                    <label className="block text-base font-bold text-slate-800">
                      1. 利用者名 <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={userInput}
                        onChange={(e) => {
                          setUserInput(e.target.value);
                          setShowUserSuggestions(true);
                        }}
                        onFocus={() => setShowUserSuggestions(true)}
                        placeholder="例：山田 太郎 (※自動で「様」がつきます)"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-base bg-white"
                      />
                      {userInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserInput("");
                            setShowUserSuggestions(true);
                          }}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          クリア
                        </button>
                      )}
                    </div>

                    {showUserSuggestions && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {(() => {
                          const query = userInput.trim().toLowerCase();
                          const filtered = savedUsers.filter(u => 
                            !query || u.toLowerCase().includes(query)
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="p-3 text-xs text-slate-400 text-center">
                                過去の履歴がありません。自由に入力してください。
                              </div>
                            );
                          }

                          return filtered.map((u) => (
                            <div
                              key={u}
                              onClick={() => {
                                setUserInput(u);
                                setShowUserSuggestions(false);
                              }}
                              className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-sm text-slate-700 transition-colors"
                            >
                              <span className="font-medium">{u}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUserFromHistory(u);
                                }}
                                className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                title="予測から削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* 2. Hygiene Category Selector Tabs */}
                  <div className="space-y-2">
                    <label className="block text-base font-bold text-slate-800">
                      2. カテゴリーの選択
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        "①尿取りパット類",
                        "②リハビリパンツ",
                        "③テープ止めオムツ",
                        "④流せるおしりふき",
                        "⑤PVC介護手袋"
                      ].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedProductId(""); // Reset chosen product on cat change
                          }}
                          className={`px-3 py-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            selectedCategory === cat
                              ? "bg-pink-50 border-pink-500 text-pink-900 ring-2 ring-pink-500/20 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="text-[10px] opacity-70">Category</span>
                          <span className="text-sm font-bold mt-1 block truncate">{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Product Select (Filters by Category) */}
                  <div className="space-y-2">
                    <label className="block text-base font-bold text-slate-800">
                      3. 物品の選択 <span className="text-slate-500 text-xs font-normal">（商品間違い防止のためメーカー、サイズ、容量を確認してください）</span>
                    </label>

                    {filteredProductsByCategory.length === 0 ? (
                      <div className="p-4 bg-slate-100 text-center text-slate-500 text-sm rounded-lg border border-slate-200">
                        選択したカテゴリー「{selectedCategory}」に登録されている商品がありません。
                        <p className="text-xs text-slate-400 mt-1">「事務所・請求管理」または「在庫・備蓄管理」画面から商品マスタへ追加してください。</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                        {filteredProductsByCategory.map((prod) => {
                          const isSelected = selectedProductId === prod.id;
                          return (
                            <div
                              key={prod.id}
                              onClick={() => setSelectedProductId(prod.id)}
                              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                                isSelected
                                  ? "bg-pink-50 border-pink-400 text-slate-900 shadow-sm"
                                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    isSelected ? "bg-pink-200 text-pink-800" : "bg-slate-200 text-slate-700"
                                  }`}>
                                    {prod.maker}
                                  </span>
                                  {prod.size !== "-" && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                      isSelected ? "bg-pink-200 text-pink-800" : "bg-slate-200 text-slate-700"
                                    }`}>
                                      サイズ: {prod.size}
                                    </span>
                                  )}
                                  <span className="text-[11px] opacity-75 font-mono">容量: {prod.capacity}</span>
                                  
                                  {prod.currentStock !== undefined && (
                                    prod.currentStock === 0 ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 animate-pulse">
                                        🚨 残り 0個 (要補充)
                                      </span>
                                    ) : prod.currentStock <= 2 ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
                                        ⚠️ 残り {prod.currentStock}個 (僅少)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                                        在庫: {prod.currentStock}個
                                      </span>
                                    )
                                  )}
                                </div>
                                <h4 className="text-base font-bold mt-1 text-slate-900">
                                  {prod.name}
                                </h4>
                                {isSelected && prod.currentStock !== undefined && withdrawalQty > prod.currentStock && (
                                  <p className="text-rose-600 text-xs font-bold mt-1.5 animate-pulse bg-rose-50 border border-rose-100 px-2 py-1 rounded">
                                    ⚠️ 注意: 指定された出庫数が現在の在庫数（残り{prod.currentStock}個）を超えています
                                  </p>
                                )}
                              </div>

                              {/* Row-end Quantity Selector inside selected row */}
                              {isSelected ? (
                                <div 
                                  className="flex items-center space-x-2 bg-white px-2 py-1.5 rounded-lg border border-pink-300 shadow-xs shrink-0 self-end sm:self-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-xs font-bold text-pink-600 font-mono">数量:</span>
                                  <button
                                    type="button"
                                    onClick={() => setWithdrawalQty(Math.max(1, withdrawalQty - 1))}
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition"
                                  >
                                    <Minus className="h-3 w-3 text-slate-600" />
                                  </button>
                                  <span className="text-base font-mono font-bold w-6 text-center text-slate-800">
                                    {withdrawalQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setWithdrawalQty(withdrawalQty + 1)}
                                    className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition"
                                  >
                                    <Plus className="h-3 w-3 text-slate-600" />
                                  </button>
                                  <span className="text-xs font-semibold text-slate-500">個</span>
                                </div>
                              ) : (
                                <div className="shrink-0 pl-1 self-end sm:self-auto">
                                  <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center bg-white text-slate-300">
                                    <Check className="h-3 w-3" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SMALL STAFF SELECTOR AT THE BOTTOM WITH AUTOCOMPLETE */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-[185px] ml-auto space-y-1.5 text-xs text-slate-700 relative" ref={staffRef}>
                    <label className="block font-bold text-slate-700">
                      出庫担当者: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={staffInput}
                        onChange={(e) => {
                          setStaffInput(e.target.value);
                          setShowStaffSuggestions(true);
                        }}
                        onFocus={() => setShowStaffSuggestions(true)}
                        placeholder="氏名を入力（例：山田）"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 outline-none text-[11px] bg-white focus:ring-1 focus:ring-pink-500"
                      />
                    </div>

                    {showStaffSuggestions && (
                      <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {(() => {
                          const query = staffInput.trim().toLowerCase();
                          const filtered = savedStaff.filter(s => 
                            !query || s.toLowerCase().includes(query)
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="p-2 text-[10px] text-slate-400 text-center">
                                履歴なし。入力してください
                              </div>
                            );
                          }

                          return filtered.map((s) => (
                            <div
                              key={s}
                              onClick={() => {
                                setStaffInput(s);
                                setShowStaffSuggestions(false);
                              }}
                              className="px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700 transition-colors"
                            >
                              <span className="font-medium">{s}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteStaffFromHistory(s);
                                }}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="予測から削除"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Submit button - PINK COLOR */}
                  <button
                    type="submit"
                    className="w-full py-4 bg-pink-500 hover:bg-pink-600 text-white text-base font-bold rounded-xl transition shadow-md shadow-pink-500/10 active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle className="h-5 w-5 stroke-[2.5]" />
                    <span>物品を在庫から出しました（登録）</span>
                  </button>

                  <p className="text-center text-[11px] text-slate-400 font-medium">
                    ※登録すると、該当する倉庫のBCP備蓄在庫からも自動的に本数が減算されます。
                  </p>

                </form>

              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            SCREEN 📱: Helper Withdrawal 2 (Staff/BCP) Screen
            ========================================================================= */}
        {activeTab === "helper2" && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Visual Simulator Frame for Desktop Testing */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              
              {/* Fake Mobile Screen Header */}
              <div className="bg-slate-900 text-slate-200 px-6 py-4 flex justify-between items-center border-b border-slate-850">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono tracking-widest text-slate-300">STAFF/BCP TERMINAL</span>
                </div>
                <div className="text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold">
                  職員用・BCP出庫管理
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                
                {/* Success Alert Toast */}
                {helper2WithdrawalSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">出庫登録完了</p>
                      <p className="text-xs text-emerald-700 mt-1">{helper2WithdrawalSuccess}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleHelper2Submit} className="space-y-6">
                  
                  {/* Date Input for Helper 2 - AT THE TOP */}
                  <div className="space-y-2 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                    <label className="block text-xs font-bold text-slate-600" style={{ fontFamily: '"Meiryo UI", "Meiryo", sans-serif' }}>
                      出庫日時（自動設定）
                    </label>
                    <input
                      type="datetime-local"
                      value={helper2WithdrawDate}
                      onChange={(e) => setHelper2WithdrawDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:ring-1 focus:ring-emerald-500"
                      style={{ fontFamily: '"Meiryo UI", "Meiryo", sans-serif' }}
                    />
                  </div>

                  {/* 1. Office Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">1</span>
                      出庫先の事業所を選択: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={helper2Office}
                      onChange={(e) => setHelper2Office(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                    >
                      <option value="サ高住">サ高住</option>
                      <option value="ヘルパーステーション">ヘルパーステーション</option>
                      <option value="デイサービス">デイサービス</option>
                    </select>
                  </div>

                  {/* 2. Category Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">2</span>
                      カテゴリーを選択: <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Object.keys(helper2Categories).map((cat) => {
                        const isActive = helper2Category === cat;
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setHelper2Category(cat)}
                            className={`px-4 py-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              isActive
                                ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm"
                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                            }`}
                          >
                            <span className="text-[10px] opacity-70" style={{ fontFamily: '"BIZ UDPGothic", "BIZ UDPゴシック", "Meiryo UI", sans-serif' }}>Category</span>
                            <span className="text-base font-bold mt-1 block" style={{ fontFamily: '"BIZ UDPGothic", "BIZ UDPゴシック", "Meiryo UI", sans-serif' }}>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Item & Quantity Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">3</span>
                      品目・出庫数を選択: <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      {/* Left: Item Selector */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={helper2ItemName}
                          onChange={(e) => setHelper2ItemName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                        >
                          {(helper2Categories[helper2Category] || []).map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>

                      {/* Right: Quantity selector (+-) */}
                      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shrink-0 self-start sm:self-auto shadow-xs">
                        <span className="text-xs font-bold text-slate-500 font-mono">数量:</span>
                        <button
                          type="button"
                          onClick={() => setHelper2Quantity(Math.max(1, helper2Quantity - 1))}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition"
                        >
                          <Minus className="h-3 w-3 text-slate-600" />
                        </button>
                        <span className="text-sm font-mono font-bold w-6 text-center text-slate-800">
                          {helper2Quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setHelper2Quantity(helper2Quantity + 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition"
                        >
                          <Plus className="h-3 w-3 text-slate-600" />
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                          {getHelper2ItemUnit(helper2ItemName)}
                        </span>
                      </div>
                    </div>

                    {helper2ItemName && (
                      <div className="mt-2 text-xs font-semibold flex items-center justify-between text-slate-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          現在の登録在庫（倉庫）:
                        </span>
                        <span className="text-emerald-800 font-mono text-sm font-bold">
                          {getHelper2ItemStock(helper2ItemName)} {getHelper2ItemUnit(helper2ItemName)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4. Staff Auto-Complete Input (Compact styled matching ①) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-w-[185px] ml-auto space-y-1.5 text-xs text-slate-700 relative" ref={helper2StaffRef}>
                    <label className="block font-bold text-slate-700">
                      出庫担当者: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={helper2StaffInput}
                        onChange={(e) => {
                          setHelper2StaffInput(e.target.value);
                          setShowHelper2StaffSuggestions(true);
                        }}
                        onFocus={() => setShowHelper2StaffSuggestions(true)}
                        placeholder="氏名を入力（例：山田）"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 outline-none text-[11px] bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {showHelper2StaffSuggestions && (
                      <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {(() => {
                          const query = helper2StaffInput.trim().toLowerCase();
                          const filtered = savedStaff.filter(s => 
                            !query || s.toLowerCase().includes(query)
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="p-3 text-[10px] text-slate-400 text-center">
                                履歴なし。入力してください
                              </div>
                            );
                          }

                          return filtered.map((s) => (
                            <div
                              key={s}
                              onClick={() => {
                                setHelper2StaffInput(s);
                                setShowHelper2StaffSuggestions(false);
                              }}
                              className="px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs text-slate-700 transition-colors"
                            >
                              <span className="font-semibold">{s}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteStaffFromHistory(s);
                                }}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="予測から削除"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl transition shadow-md shadow-emerald-600/10 active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle className="h-5 w-5 stroke-[2.5]" />
                    <span>出庫を登録する</span>
                  </button>

                  <p className="text-center text-[11px] text-slate-400 font-medium">
                    ※登録すると、在庫管理（BCP備蓄）の在庫から自動的に本数が減算されます。
                  </p>

                </form>

              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            SCREEN 💻: Office Billing & Withdrawal Log Screen 
            ========================================================================= */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            
            {/* Table Filters & Toolbar */}
            <div className="bg-lime-50/40 p-4 rounded-xl shadow-sm border border-lime-200 space-y-4">
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Search query input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="利用者名・ヘルパー・商品名で絞り込み..."
                    value={billingSearchQuery}
                    onChange={(e) => setBillingSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 outline-none text-sm bg-white focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex items-center flex-wrap gap-3 text-xs">
                  
                  {/* Status selection tab-style buttons */}
                  <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex space-x-1">
                    {["全て", "未請求", "請求済"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setBillingStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-md font-semibold transition ${
                          billingStatusFilter === st
                            ? "bg-lime-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {/* Month selection filter dropdown */}
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 font-semibold">請求月:</span>
                    <select
                      value={billingMonthFilter}
                      onChange={(e) => setBillingMonthFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none bg-white font-medium focus:ring-1 focus:ring-lime-500"
                    >
                      <option value="全て">全て表示</option>
                      {uniqueMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}分
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* User selection filter dropdown */}
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 font-semibold">利用者:</span>
                    <select
                      value={billingUserFilter}
                      onChange={(e) => setBillingUserFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none bg-white font-medium focus:ring-1 focus:ring-lime-500 max-w-[160px]"
                    >
                      <option value="全て">全て表示</option>
                      {uniqueBillingUsers.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hide Billed Items Toggle */}
                  <label className="flex items-center space-x-2 text-slate-600 font-medium select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideBilledItems}
                      onChange={(e) => setHideBilledItems(e.target.checked)}
                      className="rounded text-lime-600 border-slate-300 focus:ring-lime-500"
                    />
                    <span>請求済を非表示にする</span>
                  </label>

                </div>

              </div>

              {/* Bulk Actions Bar */}
              {selectedWithdrawals.length > 0 && (
                <div className="bg-lime-50 border border-lime-200 p-3 rounded-lg flex items-center justify-between text-sm text-slate-800 animate-fade-in">
                  <span className="font-semibold">
                    選択中：{selectedWithdrawals.length}件の払い出しデータ
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBulkBilling}
                      className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      一括で「請求済」にする
                    </button>
                    <button
                      onClick={() => setSelectedWithdrawals([])}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded transition"
                    >
                      選択解除
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Withdrawal Log List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-lime-100 flex justify-between items-center bg-lime-50/20">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-lime-600" />
                  請求管理対象一覧 ({filteredWithdrawals.length}件)
                </h3>
                {withdrawals.length > 0 && (
                  <button
                    onClick={handleClearWithdrawals}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer animate-fade-in"
                    title="すべての払い出し履歴と請求データを一括消去します"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    全ての履歴を消去する
                  </button>
                )}
              </div>

              {filteredWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  該当する払い出し履歴はありません。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold select-none">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredWithdrawals.length > 0 &&
                              filteredWithdrawals.every((w) => selectedWithdrawals.includes(w.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWithdrawals(filteredWithdrawals.map((w) => w.id));
                              } else {
                                setSelectedWithdrawals([]);
                              }
                            }}
                            className="rounded text-lime-600 border-slate-300 focus:ring-lime-500"
                          />
                        </th>
                        <th className="p-3 whitespace-nowrap">氏名（利用者名）</th>
                        <th className="p-3 whitespace-nowrap">品名</th>
                        <th className="p-3 whitespace-nowrap text-center">個数</th>
                        <th className="p-3 whitespace-nowrap text-right">請求金額 (販売額)</th>
                        <th className="p-3 whitespace-nowrap text-center">請求状況</th>
                        <th className="p-3 whitespace-nowrap text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWithdrawals.map((w) => {
                        const isBilled = w.status === "billed";
                        const isSelected = selectedWithdrawals.includes(w.id);
                        const totalBillingAmount = w.product.sellingPrice * w.quantity;
                        
                        return (
                          <tr 
                            key={w.id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              isBilled ? "bg-slate-50/50 text-slate-400" : "bg-white"
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWithdrawals([...selectedWithdrawals, w.id]);
                                  } else {
                                    setSelectedWithdrawals(selectedWithdrawals.filter((id) => id !== w.id));
                                  }
                                }}
                                className="rounded text-lime-600 border-slate-300 focus:ring-lime-500"
                              />
                            </td>

                            {/* 氏名 (利用者名) - MOVED FIRST */}
                            <td className="p-3 whitespace-nowrap font-bold text-slate-950 text-sm">
                              {w.userName}
                            </td>
                            
                            {/* 品名 */}
                            <td className="p-3">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-200">
                                  {w.product.maker}
                                </span>
                                <span className="font-bold text-slate-900">{w.product.name}</span>
                                {w.product.size !== "-" && (
                                  <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-medium">
                                    {w.product.size}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                出庫日時: {w.date} | ヘルパー: {w.staffName}
                              </span>
                            </td>

                            {/* 個数 (数量) */}
                            <td className="p-3 whitespace-nowrap text-center font-bold text-slate-800 text-sm font-mono">
                              {w.quantity} 個
                            </td>
                            
                            {/* 請求金額 */}
                            <td className="p-3 text-right font-extrabold font-mono text-sm">
                              {isBilled ? (
                                <span className="text-slate-300 line-through text-[11px] font-medium block">
                                  請求完了済
                                </span>
                              ) : (
                                <span className="text-lime-700">
                                  ¥{totalBillingAmount.toLocaleString()}
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                                    (¥{w.product.sellingPrice.toLocaleString()}/個)
                                  </span>
                                </span>
                              )}
                            </td>

                            {/* 請求状況 (トグルスイッチ型ボタンを右側に) */}
                            <td className="p-3 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleToggleBilling(w.id, w.status)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer ${
                                  isBilled
                                    ? "bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300"
                                    : "bg-lime-100 text-lime-900 border border-lime-300 hover:bg-lime-200 shadow-xs animate-pulse-glow"
                                }`}
                              >
                                {isBilled ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 inline text-emerald-600" />
                                    <span>請求済</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-3 w-3 inline text-amber-600" />
                                    <span>未請求</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* 削除操作 */}
                            <td className="p-3 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition"
                                title="削除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                      <tr className="hover:bg-slate-100/50 transition-colors">
                        <td className="p-3 text-center"></td>
                        <td className="p-3" colSpan={2}>
                          <div className="flex flex-col">
                            <span className="text-slate-800 text-xs font-bold" style={{ fontFamily: '"BIZ UDPGothic", "BIZ UDPゴシック", "Meiryo UI", sans-serif' }}>
                              {billingUserFilter !== "全て" || billingSearchQuery ? (
                                <span>【{billingUserFilter !== "全て" ? billingUserFilter : billingSearchQuery}】の請求合計</span>
                              ) : (
                                <span>表示中の請求合計</span>
                              )}
                              {billingMonthFilter !== "全て" && (
                                <span className="text-xs text-lime-700 ml-1">({billingMonthFilter}分)</span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5" style={{ fontFamily: '"BIZ UDPGothic", "BIZ UDPゴシック", "Meiryo UI", sans-serif' }}>
                              「税抜き」（既に2割増し価格）
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800 text-sm">
                          {filteredWithdrawals.reduce((sum, w) => sum + w.quantity, 0)} 個
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-sm text-lime-700">
                          ¥{filteredWithdrawals.reduce((sum, w) => sum + (w.product.sellingPrice * w.quantity), 0).toLocaleString()}
                        </td>
                        <td className="p-3" colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* =========================================================================
                EXCEL COPY-PASTE IMPORT BOARD
                ========================================================================= */}
            <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
              
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">Excelデータからコピー＆ペースト一括インポート</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Amazonの購入履歴やExcel表データをそのまま貼り付けて在庫や商品を登録します</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setActiveImportType(activeImportType === "withdrawals" ? null : "withdrawals");
                      setImportFeedback(null);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                      activeImportType === "withdrawals"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    ①購入履歴をインポート
                  </button>

                  <button
                    onClick={() => {
                      setActiveImportType(activeImportType === "products" ? null : "products");
                      setImportFeedback(null);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
                      activeImportType === "products"
                        ? "bg-teal-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    ②商品マスタを一括インポート
                  </button>
                </div>
              </div>

              {activeImportType && (
                <div className="p-6 space-y-4 animate-fade-in border-t border-slate-900">
                  
                  {activeImportType === "withdrawals" ? (
                    <div className="text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-emerald-400">【購入・払い出し履歴インポート方法】</p>
                      <p>Excelの以下の順列カラム範囲をまるごと選択しコピー（Ctrl+C）し、下のテキストエリアに貼り付け（Ctrl+V）してください。</p>
                      <p className="bg-slate-900 p-2 rounded text-slate-300 font-mono select-all overflow-x-auto whitespace-nowrap">
                        購入日 &gt; 購入先 &gt; 品目 &gt; メーカー &gt; 枚数 &gt; 品名 &gt; 販売価格 &gt; 販売日 &gt; 請求月 &gt; 請求 &gt; 提供利用者名
                      </p>
                      <p className="text-amber-300">※販売日に日付が入っているものは、その日付で払い出し実績を生成し、おむつ販売用売上が即時自動で計上されます！</p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-teal-400">【商品マスタ一括登録インポート方法】</p>
                      <p>Excelの商品マスタ表から、以下の順のカラムをコピーして貼り付けてください：</p>
                      <p className="bg-slate-900 p-2 rounded text-slate-300 font-mono select-all overflow-x-auto whitespace-nowrap">
                        注文日 &gt; メーカー名 &gt; 品目 &gt; 商品名 &gt; 容量 &gt; サイズ &gt; 金額(税込)
                      </p>
                      <p className="text-amber-300">※税込価格から自動的に【税抜仕入額 = 税込÷1.1】および【販売価格(税抜の2割増) = 税抜×1.2】を算出します。</p>
                    </div>
                  )}

                  <textarea
                    rows={6}
                    value={importTsvText}
                    onChange={(e) => setImportTsvText(e.target.value)}
                    placeholder="Excelから範囲選択してコピーした内容をここに貼り付けてください（タブ区切りテキスト）..."
                    className="w-full bg-slate-900 text-slate-100 border border-slate-800 p-3 rounded-lg outline-none text-xs font-mono focus:ring-1 focus:ring-emerald-500"
                  />

                  {importFeedback && (
                    <div className={`p-3 rounded text-xs font-semibold ${
                      importFeedback.type === "success" 
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800" 
                        : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}>
                      {importFeedback.message}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setActiveImportType(null);
                        setImportFeedback(null);
                        setImportTsvText("");
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleExcelImport}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition shadow-md cursor-pointer"
                    >
                      データを解析してインポートする
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* =========================================================================
            SCREEN 📦: Stock stockpile & BCP Management Screen
            ========================================================================= */}
        {activeTab === "stockpile" && (
          <div className="space-y-6">
            
            {/* Quick alert bar for out of stocks */}
            {(activeStockAlertsCount > 0 || activeDiaperAlertsCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-md animate-bounce-short">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900">⚠️ 在庫僅少・要発注アラート</h4>
                  <div className="text-xs text-amber-700 mt-1 space-y-1">
                    {activeStockAlertsCount > 0 && (
                      <p>
                        ・<strong>非常備蓄品</strong>：{activeStockAlertsCount}品目が在庫切れ間近（残1以下）に達しています。
                      </p>
                    )}
                    {activeDiaperAlertsCount > 0 && (
                      <p className="text-rose-600 font-bold">
                        ・<strong>衛生用品・オムツ</strong>：{activeDiaperAlertsCount}品目が在庫僅少（2個以下）に達しています。発注の手配を検討してください。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub Tabs for Stockpile View */}
            <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg shadow-xs">
              <button
                onClick={() => setStockSubTab('bcp')}
                className={`flex-1 py-2.5 text-center text-xs sm:text-sm font-bold rounded-md transition-all ${
                  stockSubTab === 'bcp'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                ① 【施設・ヘルパー用】非常災害用・BCP備蓄資材 ({stockpiles.length}品目)
              </button>
              <button
                onClick={() => setStockSubTab('diaper')}
                className={`flex-1 py-2.5 text-center text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  stockSubTab === 'diaper'
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                ② 【利用者販売用】おむつ類・介護手袋 ({products.length}品目)
                {activeDiaperAlertsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full animate-pulse">
                    {activeDiaperAlertsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl text-xs text-sky-900 leading-relaxed shadow-xs flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div>
                <strong className="font-bold">【手袋・消耗品の在庫分離管理ルール】</strong>
                <p className="mt-1">
                  「PVC使い捨て手袋S/M/L」などの同一資材は、<strong>施設・ヘルパーが業務で使う「① 非常災害用・BCP備蓄」</strong>と、<strong>利用者に販売する「② 利用者販売用」</strong>とで完全に分離され、別々の在庫として重複せず独立してカウントされます。
                </p>
                <p className="mt-1 text-slate-600">
                  ヘルパーがスマホ出庫から利用者に手袋を出庫した場合、<strong>「② 利用者販売用」のみの在庫が自動減算</strong>され、「① 施設備蓄」に影響を与えることはありません。
                </p>
              </div>
            </div>

            {stockSubTab === "bcp" ? (
              /* BCP Search and Stock table */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                
                <div className="p-4 bg-blue-50/30 border-b border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="h-5 w-5 text-blue-600" />
                    備蓄品・消耗品・BCP法定備蓄品リスト ({filteredStockpiles.length}品目)
                  </h3>

                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="備蓄品名・保管場所で検索..."
                        value={stockpileSearchQuery}
                        onChange={(e) => setStockpileSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-4 py-1.5 rounded-lg border border-slate-300 outline-none text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <label className="flex items-center space-x-2 text-xs font-semibold text-rose-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={stockpileAlertOnly}
                        onChange={(e) => setStockpileAlertOnly(e.target.checked)}
                        className="rounded text-rose-600 border-slate-300 focus:ring-rose-500"
                      />
                      <span>⚠️ アラート発生品のみ表示</span>
                    </label>
                  </div>

                </div>

                {/* Main stockpiles table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold select-none">
                        <th className="p-3">状況</th>
                        <th className="p-3">品目（備蓄品名）</th>
                        <th className="p-3 text-center">現在量（備蓄数）</th>
                        <th className="p-3 text-center">目標/必要量</th>
                        <th className="p-3">保管場所</th>
                        <th className="p-3">備考</th>
                        <th className="p-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStockpiles.map((s) => {
                        const isAlert = s.currentStock <= 1;
                        const isMuted = s.alertDismissed;
                        return (
                          <tr 
                            key={s.id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              isAlert && !isMuted ? "bg-rose-50/40" : "bg-white"
                            }`}
                          >
                            {/* Alert Indicator Column */}
                            <td className="p-3">
                              {isAlert ? (
                                isMuted ? (
                                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    <span>発注手配済</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white border border-rose-500 animate-pulse">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>🚨 在庫残少!</span>
                                  </div>
                                )
                              ) : (
                                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  <span>適正在庫</span>
                                </div>
                              )}
                            </td>

                            {/* Item Name */}
                            <td className="p-3 font-bold text-slate-900 text-sm">
                              {s.name}
                            </td>

                            {/* Quantities - and Quick adjust buttons */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStockAdjust(s.id, s.currentStock, -1)}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                  title="1つ減らす"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={s.currentStock === 0 ? "" : s.currentStock}
                                  placeholder="0"
                                  onChange={(e) => handleStockSet(s.id, parseInt(e.target.value, 10) || 0)}
                                  className={`w-14 h-6 text-center font-bold font-mono border rounded text-xs bg-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    s.currentStock <= 1 ? "border-rose-400 text-rose-600 bg-rose-50/20" : "border-slate-300 text-slate-800"
                                  }`}
                                  title="数値を直接入力して上書きできます"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStockAdjust(s.id, s.currentStock, 1)}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                  title="1つ増やす"
                                >
                                  +
                                </button>
                                <span className="text-slate-400 text-[11px] font-medium">{s.unit}</span>
                              </div>
                            </td>

                            <td className="p-3 text-center font-semibold font-mono text-slate-500">
                              {s.requiredStock} {s.unit}
                            </td>

                            <td className="p-3 font-medium text-slate-600">{s.location}</td>
                            <td className="p-3 text-slate-500 max-w-xs truncate" title={s.notes}>{s.notes || "-"}</td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-2">
                                
                                {/* Dismiss Alert button */}
                                {isAlert && (
                                  <button
                                    onClick={() => handleDismissAlert(s.id, s.alertDismissed)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                                      isMuted
                                        ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                    }`}
                                    title={isMuted ? "アラートを再表示" : "発注済みを伝えてアラートを一時解除"}
                                  >
                                    {isMuted ? "解除を取り消す" : "発注済にする"}
                                  </button>
                                )}

                                <button
                                  onClick={() => openStockpileEditModal(s)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                                  title="編集・上書き"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteStockpile(s.id)}
                                  className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition"
                                  title="リストから削除"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>

                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              /* Diaper stock status master list */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-teal-50/30 border-b border-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    衛生商品・おむつ類 在庫状況一覧 ({products.length}品目)
                  </h3>
                  
                  <div className="text-xs text-slate-500 font-medium">
                    ※ ヘルパーの「スマホ出庫」での登録により、在庫数はリアルタイムで自動減算されます。
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold select-none">
                        <th className="p-3">状況</th>
                        <th className="p-3">カテゴリー</th>
                        <th className="p-3">メーカー名</th>
                        <th className="p-3">商品名（パッケージ名）</th>
                        <th className="p-3 text-center">現在量（在庫数）</th>
                        <th className="p-3 text-center">容量</th>
                        <th className="p-3 text-center">サイズ</th>
                        <th className="p-3 text-right">販売単価(税込)</th>
                        <th className="p-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((prod) => {
                        const stockVal = prod.currentStock !== undefined ? prod.currentStock : 0;
                        const isAlert = stockVal <= 2;
                        return (
                          <tr 
                            key={prod.id} 
                            className={`hover:bg-slate-50 transition-colors ${
                              isAlert ? "bg-rose-50/40" : "bg-white"
                            }`}
                          >
                            <td className="p-3">
                              {stockVal === 0 ? (
                                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white border border-rose-500 animate-pulse">
                                  <span>🚨 在庫切れ (要発注!)</span>
                                </div>
                              ) : stockVal <= 2 ? (
                                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white border border-amber-400">
                                  <span>⚠️ 在庫僅少 ({stockVal}個)</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  <span>適正在庫</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-slate-500">{prod.category}</td>
                            <td className="p-3">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                                {prod.maker}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900 text-sm">{prod.name}</td>
                            
                            {/* In-place stock adjust with buttons & input like stockpiles */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleProductStockAdjust(prod.id, stockVal, -1)}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                  title="1つ減らす"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={prod.currentStock === undefined || prod.currentStock === 0 ? "" : prod.currentStock}
                                  placeholder="0"
                                  onChange={(e) => handleProductStockSet(prod.id, parseInt(e.target.value, 10) || 0)}
                                  className={`w-14 h-6 text-center font-bold font-mono border rounded text-xs bg-white outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isAlert ? "border-rose-400 text-rose-600 bg-rose-50/20" : "border-slate-300 text-slate-800"
                                  }`}
                                  title="数値を直接入力して上書きできます"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleProductStockAdjust(prod.id, stockVal, 1)}
                                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                  title="1つ増やす"
                                >
                                  +
                                </button>
                                <span className="text-slate-400 text-[10px] font-medium">個</span>
                              </div>
                            </td>

                            <td className="p-3 text-center font-mono font-medium text-slate-500">{prod.capacity}</td>
                            <td className="p-3 text-center font-bold text-slate-700">{prod.size}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-700">¥{prod.sellingPrice.toLocaleString()}</td>
                            
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => openEditModal(prod)}
                                  className="text-teal-600 hover:text-teal-800 p-1.5 rounded hover:bg-teal-50 transition"
                                  title="編集・上書き"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="text-rose-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Side-by-Side Admin Form Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Add New Stockpile Item Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-slate-600" />
                  新しい備蓄品（BCP備蓄）をリストに追加
                </h4>

                <form onSubmit={handleAddStockpile} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="space-y-1">
                    <label className="font-bold">品目（備蓄品名） <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="例：薬用ハンドソープ（5L)"
                      value={newStockName}
                      onChange={(e) => setNewStockName(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">単位 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="例：個、枚、本、箱"
                      value={newStockUnit}
                      onChange={(e) => setNewStockUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">初期備蓄量 <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      placeholder="例：10"
                      value={newStockQty}
                      onChange={(e) => setNewStockQty(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">必要基準量（BCP目標） <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      placeholder="例：10"
                      value={newStockRequired}
                      onChange={(e) => setNewStockRequired(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">保管場所</label>
                    <input
                      type="text"
                      placeholder="例：5番館倉庫"
                      value={newStockLocation}
                      onChange={(e) => setNewStockLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold">備考</label>
                    <input
                      type="text"
                      placeholder="例：手洗い場詰替え用。詰め替えパック2個で1箱"
                      value={newStockNotes}
                      onChange={(e) => setNewStockNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition cursor-pointer shadow-sm"
                  >
                    備蓄品を登録する
                  </button>
                </form>
              </div>

              {/* Add New Product to Master Catalog Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  オムツ等販売用商品マスタへの手動登録
                </h4>

                <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  
                  <div className="space-y-1">
                    <label className="font-bold">品目カテゴリー <span className="text-rose-500">*</span></label>
                    <select
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none bg-white"
                    >
                      <option value="尿取りパット類">①尿取りパット類</option>
                      <option value="リハビリパンツ">②リハビリパンツ</option>
                      <option value="テープ止めオムツ">③テープ止めオムツ</option>
                      <option value="流せるおしりふき">④流せるおしりふき</option>
                      <option value="PVC介護手袋">⑤PVC介護手袋</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">メーカー名 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="例：リフレ"
                      value={newProdMaker}
                      onChange={(e) => setNewProdMaker(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold">商品名（パッケージ記載名） <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="例：スピードキャッチパッド スーパー(10回吸収)"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">容量</label>
                    <input
                      type="text"
                      placeholder="例：30枚"
                      value={newProdCapacity}
                      onChange={(e) => setNewProdCapacity(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">サイズ</label>
                    <input
                      type="text"
                      placeholder="例：M、L、S"
                      value={newProdSize}
                      onChange={(e) => setNewProdSize(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">仕入れ金額(税込価格) <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      placeholder="例：2273"
                      value={newProdPriceInclTax}
                      onChange={(e) => setNewProdPriceInclTax(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">初期の現在庫数 <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      required
                      placeholder="例：10"
                      value={newProdCurrentStock}
                      onChange={(e) => setNewProdCurrentStock(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* Calculations Preview widget */}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-500 leading-tight space-y-1">
                    <p className="font-bold text-slate-700">【自動計算値プレビュー】</p>
                    <p>仕入税抜価格: {newProdPriceInclTax ? `¥${Math.round(newProdPriceInclTax / 1.1).toLocaleString()}` : "未入力"}</p>
                    <p className="text-blue-700 font-semibold">販売価格(税抜の2割増): {newProdPriceInclTax ? `¥${Math.round(Math.round(newProdPriceInclTax / 1.1) * 1.2).toLocaleString()}` : "未入力"}</p>
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 mt-2 w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded transition cursor-pointer shadow-sm"
                  >
                    商品をマスタへ登録する
                  </button>
                </form>
              </div>

            </div>

            {/* Current Product Master list view for admin check */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 select-none">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  登録済み衛生用品・おむつマスタ一覧 ({products.length}件)
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  ※ヘルパー画面のプルダウンに自動連携されます
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
                      <th className="p-3">カテゴリー</th>
                      <th className="p-3">メーカー名</th>
                      <th className="p-3">商品名（パッケージ名）</th>
                      <th className="p-3 text-center">容量</th>
                      <th className="p-3 text-center">サイズ</th>
                      <th className="p-3 text-center">現在庫数</th>
                      <th className="p-3 text-right">仕入税込単価</th>
                      <th className="p-3 text-right">仕入税抜単価</th>
                      <th className="p-3 text-right text-blue-700 font-extrabold bg-blue-50/10">販売単価(税抜2割増)</th>
                      <th className="p-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-600">{prod.category}</td>
                        <td className="p-3"><span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">{prod.maker}</span></td>
                        <td className="p-3 font-bold text-slate-900">{prod.name}</td>
                        <td className="p-3 text-center font-mono">{prod.capacity}</td>
                        <td className="p-3 text-center font-bold">{prod.size}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {prod.currentStock !== undefined ? (
                            prod.currentStock === 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 animate-pulse text-[10px]">
                                🚨 0個 (要補充)
                              </span>
                            ) : prod.currentStock <= 2 ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[10px]">
                                ⚠️ {prod.currentStock}個 (僅少)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[10px]">
                                {prod.currentStock}個
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">¥{prod.priceInclTax.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-slate-500">¥{prod.priceExclTax.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-sm text-blue-700 font-mono bg-blue-50/10">¥{prod.sellingPrice.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                              title="編集・上書き"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer Branding block */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto shrink-0 select-none">
        <p className="font-semibold">© 2026 桃の郷 京都東山 在庫管理アプリ</p>
        <p className="text-[10px] text-slate-400 mt-1">
          衛生用品出庫記録・請求金額集計・BCP災害備え備蓄管理システム
        </p>
      </footer>

      {/* Product Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <Edit className="h-5 w-5 text-teal-600" />
                おむつ・衛生用品の登録情報変更
              </h3>
              <button 
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 transition text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateProductSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-bold">品目カテゴリー <span className="text-rose-500">*</span></label>
                <select
                  value={editProdCategory}
                  onChange={(e) => setEditProdCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none bg-white"
                >
                  <option value="尿取りパット類">①尿取りパット類</option>
                  <option value="リハビリパンツ">②リハビリパンツ</option>
                  <option value="テープ止めオムツ">③テープ止めオムツ</option>
                  <option value="流せるおしりふき">④流せるおしりふき</option>
                  <option value="PVC介護手袋">⑤PVC介護手袋</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold">メーカー名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例：リフレ"
                  value={editProdMaker}
                  onChange={(e) => setEditProdMaker(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold">商品名（パッケージ記載名） <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="商品名"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">容量</label>
                <input
                  type="text"
                  placeholder="例：30枚"
                  value={editProdCapacity}
                  onChange={(e) => setEditProdCapacity(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">サイズ</label>
                <input
                  type="text"
                  placeholder="例：M、L"
                  value={editProdSize}
                  onChange={(e) => setEditProdSize(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">仕入れ金額(税込価格) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  value={editProdPriceInclTax}
                  onChange={(e) => setEditProdPriceInclTax(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">現在庫数 <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  value={editProdCurrentStock}
                  onChange={(e) => setEditProdCurrentStock(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-teal-400 outline-none focus:ring-1 focus:ring-teal-500 font-mono font-bold text-slate-800 bg-teal-50/20"
                />
              </div>

              {/* BCP Sync Checkbox */}
              <div className="sm:col-span-2 py-2 px-3 bg-teal-50/40 rounded-lg border border-teal-100 flex items-start space-x-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  id="syncWithBcpCheckbox"
                  checked={syncWithBcp}
                  onChange={(e) => setSyncWithBcp(e.target.checked)}
                  className="rounded text-teal-600 border-slate-300 focus:ring-teal-500 h-4 w-4 mt-0.5"
                />
                <label htmlFor="syncWithBcpCheckbox" className="font-semibold text-slate-700 text-[11px] leading-tight cursor-pointer">
                  この商品の【現在庫数】の変更を、施設・BCP備蓄品の「同名/類似品」の在庫数にも自動的に上書き連動させる
                </label>
              </div>

              {/* Calculations Preview widget */}
              <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-500 leading-tight space-y-1">
                <p className="font-bold text-slate-700">【再計算値プレビュー】</p>
                <p>仕入税抜価格: {editProdPriceInclTax ? `¥${Math.round(Number(editProdPriceInclTax) / 1.1).toLocaleString()}` : "0"}</p>
                <p className="text-teal-700 font-semibold">販売価格(税抜の2割増): {editProdPriceInclTax ? `¥${Math.round(Math.round(Number(editProdPriceInclTax) / 1.1) * 1.2).toLocaleString()}` : "0"}</p>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition shadow-sm cursor-pointer"
                >
                  変更を保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stockpile Edit Modal */}
      {editingStockpile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <Edit className="h-5 w-5 text-blue-600" />
                備蓄品（BCP備蓄）の登録情報変更
              </h3>
              <button 
                type="button"
                onClick={() => setEditingStockpile(null)}
                className="text-slate-400 hover:text-slate-600 transition text-lg font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleUpdateStockpileSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold">品目（備蓄品名） <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例：薬用ハンドソープ（5L)"
                  value={editStockName}
                  onChange={(e) => setEditStockName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">単位 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="例：個、枚、本、箱"
                  value={editStockUnit}
                  onChange={(e) => setEditStockUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">現在庫数/備蓄量 <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  placeholder="例：10"
                  value={editStockQty}
                  onChange={(e) => setEditStockQty(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">必要基準量（BCP目標） <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  required
                  placeholder="例：10"
                  value={editStockRequired}
                  onChange={(e) => setEditStockRequired(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">保管場所</label>
                <input
                  type="text"
                  placeholder="例：5番館倉庫"
                  value={editStockLocation}
                  onChange={(e) => setEditStockLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold">備考</label>
                <input
                  type="text"
                  placeholder="備考"
                  value={editStockNotes}
                  onChange={(e) => setEditStockNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStockpile(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-sm cursor-pointer"
                >
                  変更を保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-scale-up">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
              >
                {confirmModal.confirmText || "確定する"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
