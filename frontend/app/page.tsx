"use client";

import { useEffect, useState } from "react";
import { getMenu, placeOrder, lookupTable } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { CartProvider, useCart } from "@/lib/cart-context";
import { MenuItemDTO, MenuResponse, OrderMode, PaymentMethod } from "@/lib/types";
import ScanScreen from "@/components/ScanScreen";
import MenuScreen from "@/components/MenuScreen";
import ItemDetailSheet from "@/components/ItemDetailSheet";
import CartScreen from "@/components/CartScreen";
import ConfirmScreen from "@/components/ConfirmScreen";

type Screen = "scan" | "menu" | "cart" | "confirm";

const ORDER_MODE: OrderMode =
  process.env.NEXT_PUBLIC_ORDER_MODE === "delivery" ? "delivery" : "table";

interface ConfirmData {
  orderId: string;
  orderNumber: number;
  paymentMethod: PaymentMethod;
  confirmSubtext: string;
  scheduledFor: string | null;
  loyaltyPoints: { earned: number; balance: number } | null;
}

interface CheckoutOptions {
  scheduledFor: string | null;
  customerPhone: string | null;
}

function OrderApp() {
  const [screen, setScreen] = useState<Screen>("scan");
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [detail, setDetail] = useState<{ catKey: string; item: MenuItemDTO } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
  const [tableSlug, setTableSlug] = useState<string | null>(null);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [tableInvalid, setTableInvalid] = useState(false);

  const { cart, clear } = useCart();

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("table");
    if (!slug) return;
    lookupTable(slug)
      .then((table) => {
        if (table) {
          setTableSlug(slug);
          setTableLabel(table.label);
        } else {
          setTableInvalid(true);
        }
      })
      .catch(() => {
        // Backend unreachable — don't block browsing, just skip table association.
      });
  }, []);

  useEffect(() => {
    getMenu()
      .then((data) => {
        setMenu(data);
        setActiveCategory(data.categories[0]?.key ?? "");
      })
      .catch(() => setLoadError("Impossible de charger le menu. Vérifiez que le serveur tourne."));
  }, []);

  // Real-time menu sync: availability changes made by staff push instantly.
  useEffect(() => {
    const socket = getSocket();
    function refetch() {
      getMenu()
        .then(setMenu)
        .catch(() => {});
    }
    socket.on("menu:updated", refetch);
    return () => {
      socket.off("menu:updated", refetch);
    };
  }, []);

  async function handlePlaceOrder(paymentMethod: PaymentMethod, options: CheckoutOptions) {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const result = await placeOrder(ORDER_MODE, cart, paymentMethod, { tableSlug, ...options });
      setConfirmData({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        paymentMethod: result.paymentMethod,
        confirmSubtext: result.confirmSubtext,
        scheduledFor: result.scheduledFor,
        loyaltyPoints: result.loyaltyPoints,
      });
      clear();
      setScreen("confirm");
    } catch {
      setLoadError("La commande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setPlacing(false);
    }
  }

  if (tableInvalid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red text-[36px] text-white">
          !
        </div>
        <div className="font-display text-[26px]">TABLE INVALIDE</div>
        <div className="max-w-[300px] text-sm text-muted">
          Ce QR code ne correspond à aucune table du restaurant. Demandez de l&apos;aide au personnel, ou
          continuez sans association de table.
        </div>
        <button
          onClick={() => setTableInvalid(false)}
          className="rounded-full bg-green px-8 py-3.5 font-display text-lg tracking-wide text-[#08130a]"
        >
          CONTINUER SANS TABLE
        </button>
      </div>
    );
  }

  if (screen === "scan") {
    return <ScanScreen onEnter={() => setScreen("menu")} />;
  }

  if (loadError && !menu) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-muted">
        {loadError}
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Chargement du menu…
      </div>
    );
  }

  return (
    <>
      {screen === "menu" && (
        <MenuScreen
          categories={menu.categories.filter((c) => c.items.length > 0)}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onOpenItem={(catKey, item) => setDetail({ catKey, item })}
          onGoToCart={() => setScreen("cart")}
          tableLabel={tableLabel}
        />
      )}

      {screen === "cart" && (
        <CartScreen
          mode={ORDER_MODE}
          onBack={() => setScreen("menu")}
          onPlaceOrder={handlePlaceOrder}
          placing={placing}
        />
      )}

      {screen === "confirm" && confirmData && (
        <ConfirmScreen
          orderId={confirmData.orderId}
          orderNumber={confirmData.orderNumber}
          paymentMethod={confirmData.paymentMethod}
          confirmSubtext={confirmData.confirmSubtext}
          scheduledFor={confirmData.scheduledFor}
          loyaltyPoints={confirmData.loyaltyPoints}
          onNewOrder={() => setScreen("menu")}
        />
      )}

      {detail && (
        <ItemDetailSheet
          key={detail.item.id}
          item={detail.item}
          categoryKey={detail.catKey}
          supplements={menu.supplements}
          allCategories={menu.categories}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <CartProvider>
      <OrderApp />
    </CartProvider>
  );
}
