import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type VendorConnection = Tables<"vendor_connections">;
export type MessageRow = Tables<"chat_messages">;
export type OrderRow = Tables<"orders">;
export type UserRoleRow = Tables<"user_roles">;
export type AdminCommissionRow = Tables<"admin_commissions">;
export type InviteCodeRow = Tables<"invite_codes">;

export interface VendorHierarchyNode {
  profile: Profile;
  clients: Profile[];
  drivers: Profile[];
}

export interface AdminDashboardData {
  loading: boolean;
  profiles: Profile[];
  connections: VendorConnection[];
  latestMessages: MessageRow[];
  orders: OrderRow[];
  userRoles: UserRoleRow[];
  adminCommissions: AdminCommissionRow[];
  inviteCodes: InviteCodeRow[];
  rolesByUser: Map<string, UserRoleRow["role"][]>;
  vendorProfiles: Profile[];
  vendorHierarchy: VendorHierarchyNode[];
  ordersByVendor: Map<string, { totalCents: number; count: number }>;
  commissionsByVendor: Map<string, { totalCommissionCents: number; lastRate: number | null }>;
  totalUsers: number;
  totalOrders: number;
  totalOrdersToday: number;
  revenueTodayCents: number;
  headerStatusLabel: string;
}

export function useAdminDashboardData(): AdminDashboardData {
  const queryClient = useQueryClient();

  const {
    data: profilesData,
    isLoading: profilesLoading,
  } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data as Profile[];
    },
  });
  const profiles = profilesData ?? [];

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
  } = useQuery({
    queryKey: ["admin", "vendor_connections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendor_connections").select("*");
      if (error) throw error;
      return data as VendorConnection[];
    },
  });
  const connections = connectionsData ?? [];

  const {
    data: latestMessagesData,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ["admin", "chat_messages", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, chat_id, sender_id, created_at, type, is_read")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as MessageRow[];
    },
  });
  const latestMessages = latestMessagesData ?? [];

  const {
    data: ordersData,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ["admin", "orders", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as OrderRow[];
    },
  });
  const orders = ordersData ?? [];

  const {
    data: userRolesData,
    isLoading: rolesLoading,
  } = useQuery({
    queryKey: ["admin", "user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as UserRoleRow[];
    },
  });
  const userRoles = userRolesData ?? [];

  const {
    data: adminCommissionsData,
    isLoading: commissionsLoading,
  } = useQuery({
    queryKey: ["admin", "admin_commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_commissions").select("*");
      if (error) throw error;
      return data as AdminCommissionRow[];
    },
  });
  const adminCommissions = adminCommissionsData ?? [];

  const {
    data: inviteCodesData,
    isLoading: invitesLoading,
  } = useQuery({
    queryKey: ["admin", "invite_codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as InviteCodeRow[];
    },
  });
  const inviteCodes = inviteCodesData ?? [];

  const loading =
    profilesLoading ||
    connectionsLoading ||
    messagesLoading ||
    ordersLoading ||
    rolesLoading ||
    commissionsLoading ||
    invitesLoading;

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendor_connections" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "vendor_connections"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "chat_messages", "latest"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "orders", "recent"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "user_roles"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_commissions" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "admin_commissions"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invite_codes" },
        () => queryClient.invalidateQueries({ queryKey: ["admin", "invite_codes"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rolesByUser = useMemo(() => {
    const map = new Map<string, UserRoleRow["role"][]>();
    userRoles.forEach((r) => {
      const current = map.get(r.user_id) ?? [];
      current.push(r.role);
      map.set(r.user_id, current);
    });
    return map;
  }, [userRoles]);

  const vendorProfiles: Profile[] = useMemo(
    () =>
      profiles.filter((p) => {
        const roles = rolesByUser.get(p.id) ?? [];
        return roles.includes("vendor");
      }),
    [profiles, rolesByUser],
  );

  const vendorHierarchy: VendorHierarchyNode[] = useMemo(() => {
    return vendorProfiles.map((vendor) => {
      const vendorConns = connections.filter((c) => c.vendor_id === vendor.id);
      const clients: Profile[] = [];
      const drivers: Profile[] = [];

      vendorConns.forEach((conn) => {
        const profile = profiles.find((p) => p.id === conn.associate_id);
        if (!profile) return;
        if (conn.type === "client") clients.push(profile);
        if (conn.type === "driver") drivers.push(profile);
      });

      return { profile: vendor, clients, drivers };
    });
  }, [vendorProfiles, connections, profiles]);

  const ordersByVendor = useMemo(() => {
    const map = new Map<
      string,
      {
        totalCents: number;
        count: number;
      }
    >();

    orders.forEach((order) => {
      if (!order.vendor_id) return;
      const current = map.get(order.vendor_id) ?? { totalCents: 0, count: 0 };
      current.totalCents += order.total_cents ?? 0;
      current.count += 1;
      map.set(order.vendor_id, current);
    });

    return map;
  }, [orders]);

  const commissionsByVendor = useMemo(() => {
    const map = new Map<
      string,
      {
        totalCommissionCents: number;
        lastRate: number | null;
      }
    >();

    adminCommissions.forEach((c) => {
      const current = map.get(c.vendor_id) ?? { totalCommissionCents: 0, lastRate: null };
      current.totalCommissionCents += c.commission_cents ?? 0;
      current.lastRate = c.commission_rate ?? current.lastRate;
      map.set(c.vendor_id, current);
    });

    return map;
  }, [adminCommissions]);

  const totalUsers = profiles.length;
  const totalOrders = orders.length;

  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter((o) => (o.created_at ?? "").startsWith(today));
  const totalOrdersToday = ordersToday.length;
  const revenueTodayCents = ordersToday.reduce((acc, o) => acc + (o.total_cents ?? 0), 0);

  const headerStatusLabel = loading ? "SYNCING" : "SECURE";

  return {
    loading,
    profiles,
    connections,
    latestMessages,
    orders,
    userRoles,
    adminCommissions,
    inviteCodes,
    rolesByUser,
    vendorProfiles,
    vendorHierarchy,
    ordersByVendor,
    commissionsByVendor,
    totalUsers,
    totalOrders,
    totalOrdersToday,
    revenueTodayCents,
    headerStatusLabel,
  };
}
