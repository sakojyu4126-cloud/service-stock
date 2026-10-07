import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Product, Stockpile, Withdrawal, StaffWithdrawal } from "./types";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Strict Error Handling matching security skill requirements
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: false,
      isAnonymous: true,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "metadata", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client offline warning.");
    }
  }
}

// Helper to make clean document IDs
function cleanDocId(raw: string): string {
  return encodeURIComponent(raw.replace(/[/\\]/g, "_"));
}

// Subscribe to all collections with real-time multi-device synchronization
export function subscribeToAllData(callbacks: {
  onProducts: (products: Product[]) => void;
  onStockpiles: (stockpiles: Stockpile[]) => void;
  onWithdrawals: (withdrawals: Withdrawal[]) => void;
  onStaffWithdrawals: (staffWithdrawals: StaffWithdrawal[]) => void;
  onUsers: (users: string[]) => void;
  onStaff: (staff: string[]) => void;
  onError?: (err: any) => void;
}) {
  const unsubs: (() => void)[] = [];

  // 1. Products
  try {
    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Product);
          });
          callbacks.onProducts(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "products");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubProducts);
  } catch (e) {
    console.warn("Failed to subscribe to products:", e);
  }

  // 2. Stockpiles
  try {
    const unsubStockpiles = onSnapshot(
      collection(db, "stockpiles"),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Stockpile[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Stockpile);
          });
          callbacks.onStockpiles(list);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "stockpiles");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubStockpiles);
  } catch (e) {
    console.warn("Failed to subscribe to stockpiles:", e);
  }

  // 3. Withdrawals (スマホ出庫①)
  try {
    const unsubWithdrawals = onSnapshot(
      collection(db, "withdrawals"),
      (snapshot) => {
        const list: Withdrawal[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Withdrawal);
        });
        // Sort newest first
        list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        callbacks.onWithdrawals(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "withdrawals");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubWithdrawals);
  } catch (e) {
    console.warn("Failed to subscribe to withdrawals:", e);
  }

  // 4. Staff Withdrawals (スマホ出庫②)
  try {
    const unsubStaffWithdrawals = onSnapshot(
      collection(db, "staffWithdrawals"),
      (snapshot) => {
        const list: StaffWithdrawal[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as StaffWithdrawal);
        });
        // Sort newest first
        list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        callbacks.onStaffWithdrawals(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "staffWithdrawals");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubStaffWithdrawals);
  } catch (e) {
    console.warn("Failed to subscribe to staffWithdrawals:", e);
  }

  // 5. Users master
  try {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        if (!snapshot.empty) {
          const names: string[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data?.name && !names.includes(data.name)) {
              names.push(data.name);
            }
          });
          callbacks.onUsers(names);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "users");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubUsers);
  } catch (e) {
    console.warn("Failed to subscribe to users:", e);
  }

  // 6. Staff master
  try {
    const unsubStaff = onSnapshot(
      collection(db, "staff"),
      (snapshot) => {
        if (!snapshot.empty) {
          const names: string[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data?.name && !names.includes(data.name)) {
              names.push(data.name);
            }
          });
          callbacks.onStaff(names);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "staff");
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubStaff);
  } catch (e) {
    console.warn("Failed to subscribe to staff:", e);
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
  };
}

// Initial bootstrap if Firestore database is empty
export async function initializeFirestoreIfEmpty(defaults: {
  products: Product[];
  stockpiles: Stockpile[];
  withdrawals: Withdrawal[];
  users: string[];
  staff: string[];
}) {
  try {
    const prodSnap = await getDocs(collection(db, "products"));
    if (prodSnap.empty) {
      console.log("Seeding Firestore with master catalogs...");
      const batch = writeBatch(db);

      // Seed products
      defaults.products.forEach((p) => {
        batch.set(doc(db, "products", p.id), {
          ...p,
          updatedAt: new Date().toISOString()
        });
      });

      // Seed stockpiles
      defaults.stockpiles.forEach((s) => {
        batch.set(doc(db, "stockpiles", s.id), {
          ...s,
          updatedAt: new Date().toISOString()
        });
      });

      // Seed withdrawals
      defaults.withdrawals.forEach((w) => {
        batch.set(doc(db, "withdrawals", w.id), {
          ...w,
          createdAt: new Date().toISOString()
        });
      });

      // Seed users
      defaults.users.forEach((u, i) => {
        batch.set(doc(db, "users", cleanDocId(u)), {
          name: u,
          order: i
        });
      });

      // Seed staff
      defaults.staff.forEach((s, i) => {
        batch.set(doc(db, "staff", cleanDocId(s)), {
          name: s,
          order: i
        });
      });

      // Meta doc
      batch.set(doc(db, "metadata", "connection"), {
        initializedAt: new Date().toISOString(),
        version: "1.0.0"
      });

      await batch.commit();
      console.log("Firestore seeding completed successfully.");
    }
  } catch (e) {
    console.warn("initializeFirestoreIfEmpty notice:", e);
  }
}

// 1. スマホ出庫① (利用者個別販売出庫の登録 ＆ 商品在庫マイナス)
export async function registerWithdrawalToFirestore(
  withdrawal: Withdrawal,
  updatedProduct: Product,
  newUserName?: string,
  newStaffName?: string
) {
  try {
    const batch = writeBatch(db);

    // Add withdrawal doc
    batch.set(doc(db, "withdrawals", withdrawal.id), {
      ...withdrawal,
      createdAt: new Date().toISOString()
    });

    // Update product stock
    batch.set(
      doc(db, "products", updatedProduct.id),
      {
        ...updatedProduct,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Auto-register user name if new
    if (newUserName) {
      batch.set(
        doc(db, "users", cleanDocId(newUserName)),
        { name: newUserName, order: Date.now() },
        { merge: true }
      );
    }

    // Auto-register staff name if new
    if (newStaffName) {
      batch.set(
        doc(db, "staff", cleanDocId(newStaffName)),
        { name: newStaffName, order: Date.now() },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "withdrawals");
  }
}

// 2. スマホ出庫② (職員・BCP備蓄出庫の登録 ＆ 備蓄在庫マイナス)
export async function registerStaffWithdrawalToFirestore(
  staffWithdrawal: StaffWithdrawal,
  updatedStockpile: Stockpile,
  newStaffName?: string
) {
  try {
    const batch = writeBatch(db);

    // Add staff withdrawal doc
    batch.set(doc(db, "staffWithdrawals", staffWithdrawal.id), {
      ...staffWithdrawal,
      createdAt: new Date().toISOString()
    });

    // Update stockpile stock
    batch.set(
      doc(db, "stockpiles", updatedStockpile.id),
      {
        ...updatedStockpile,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Auto-register staff name if new
    if (newStaffName) {
      batch.set(
        doc(db, "staff", cleanDocId(newStaffName)),
        { name: newStaffName, order: Date.now() },
        { merge: true }
      );
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "staffWithdrawals");
  }
}

// 3. 出庫履歴の削除 (利用者出庫削除 ＆ 在庫の自動復元)
export async function deleteWithdrawalFromFirestore(id: string, restoredProduct?: Product) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "withdrawals", id));
    if (restoredProduct) {
      batch.set(
        doc(db, "products", restoredProduct.id),
        {
          ...restoredProduct,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `withdrawals/${id}`);
  }
}

// 4. 職員出庫履歴の削除 (職員出庫削除 ＆ 備蓄在庫の自動復元)
export async function deleteStaffWithdrawalFromFirestore(id: string, restoredStockpile?: Stockpile) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "staffWithdrawals", id));
    if (restoredStockpile) {
      batch.set(
        doc(db, "stockpiles", restoredStockpile.id),
        {
          ...restoredStockpile,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `staffWithdrawals/${id}`);
  }
}

// 5. 複数出庫履歴の削除
export async function deleteMultipleWithdrawalsFromFirestore(
  ids: string[],
  restoredProducts?: Product[]
) {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, "withdrawals", id));
    });
    if (restoredProducts) {
      restoredProducts.forEach((p) => {
        batch.set(
          doc(db, "products", p.id),
          {
            ...p,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "withdrawals");
  }
}

// 6. 職員出庫履歴の全消去
export async function clearAllStaffWithdrawalsFromFirestore(ids: string[]) {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, "staffWithdrawals", id));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "staffWithdrawals");
  }
}

// 7. 請求ステータスの変更
export async function updateWithdrawalStatusInFirestore(
  id: string,
  status: "billed" | "unbilled",
  billedDate: string | null
) {
  try {
    await updateDoc(doc(db, "withdrawals", id), {
      status,
      billedDate
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
  }
}

// 8. 商品マスタの追加・更新・削除
export async function saveProductToFirestore(product: Product) {
  try {
    await setDoc(doc(db, "products", product.id), {
      ...product,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, "products", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
}

// 9. BCP備蓄品マスタの追加・更新・削除
export async function saveStockpileToFirestore(stockpile: Stockpile) {
  try {
    await setDoc(doc(db, "stockpiles", stockpile.id), {
      ...stockpile,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stockpiles/${stockpile.id}`);
  }
}

export async function deleteStockpileFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, "stockpiles", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `stockpiles/${id}`);
  }
}

// 10. 名簿からの削除
export async function deleteUserFromFirestore(name: string) {
  try {
    await deleteDoc(doc(db, "users", cleanDocId(name)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${cleanDocId(name)}`);
  }
}

export async function deleteStaffFromFirestore(name: string) {
  try {
    await deleteDoc(doc(db, "staff", cleanDocId(name)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `staff/${cleanDocId(name)}`);
  }
}

// 11. バックアップからの全体一括復元
export async function restoreAllDataToFirestore(data: {
  products: Product[];
  stockpiles: Stockpile[];
  withdrawals?: Withdrawal[];
  staffWithdrawals?: StaffWithdrawal[];
  users?: string[];
  staff?: string[];
}) {
  try {
    const batch = writeBatch(db);

    if (data.products) {
      data.products.forEach((p) => {
        batch.set(doc(db, "products", p.id), {
          ...p,
          updatedAt: new Date().toISOString()
        });
      });
    }

    if (data.stockpiles) {
      data.stockpiles.forEach((s) => {
        batch.set(doc(db, "stockpiles", s.id), {
          ...s,
          updatedAt: new Date().toISOString()
        });
      });
    }

    if (data.withdrawals) {
      data.withdrawals.forEach((w) => {
        batch.set(doc(db, "withdrawals", w.id), {
          ...w,
          createdAt: w.createdAt || new Date().toISOString()
        });
      });
    }

    if (data.staffWithdrawals) {
      data.staffWithdrawals.forEach((sw) => {
        batch.set(doc(db, "staffWithdrawals", sw.id), {
          ...sw,
          createdAt: sw.createdAt || new Date().toISOString()
        });
      });
    }

    if (data.users) {
      data.users.forEach((u, i) => {
        batch.set(doc(db, "users", cleanDocId(u)), {
          name: u,
          order: i
        });
      });
    }

    if (data.staff) {
      data.staff.forEach((s, i) => {
        batch.set(doc(db, "staff", cleanDocId(s)), {
          name: s,
          order: i
        });
      });
    }

    batch.set(doc(db, "metadata", "lastRestore"), {
      restoredAt: new Date().toISOString()
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "restore");
  }
}
