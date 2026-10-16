import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAllUsers, updateUserRole, approveUser, deleteUser } from "@/lib/admin.functions";
import { getAllUnitsData } from "@/lib/data.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserCheck, Clock, UserX, Search } from "lucide-react";

interface AdminUser {
  id: string;
  email?: string;
  full_name?: string;
  position?: string;
  phone?: string;
  unit_name?: string;
  created_at: string;
  is_approved: boolean;
  has_submitted_registration?: boolean;
  role: "super_admin" | "unit_admin" | null;
  requested_role: string | null;
  unit_ids: string[];
}

interface UnitItem {
  id: string;
  name: string;
  district?: string | null;
  type?: string | null;
}

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const approveUserFn = useServerFn(approveUser);
  const updateUserRoleFn = useServerFn(updateUserRole);
  const deleteUserFn = useServerFn(deleteUser);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin_users"],
    queryFn: () => getAllUsers() as Promise<{ users: AdminUser[] }>,
  });

  const { data: unitsData } = useQuery<UnitItem[]>({
    queryKey: ["units"],
    queryFn: () => getAllUnitsData() as Promise<UnitItem[]>,
  });

  const approveMutation = useMutation({
    mutationFn: (vars: {
      userId: string;
      role: "super_admin" | "unit_admin";
      unitId?: string | null;
    }) => approveUserFn({ data: vars }),
    onSuccess: () => {
      toast.success("อนุมัติสิทธิ์ผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`เกิดข้อผิดพลาดในการอนุมัติ: ${msg}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      userId: string;
      role: "super_admin" | "unit_admin";
      unitIds?: string[];
      fullName?: string;
      position?: string;
      phone?: string;
    }) => updateUserRoleFn({ data: vars }),
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setIsEditDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`เกิดข้อผิดพลาด: ${msg}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { userId: string }) => deleteUserFn({ data: vars }),
    onSuccess: () => {
      toast.success("ลบผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`เกิดข้อผิดพลาดในการลบ: ${msg}`);
    },
  });

  const handleApprove = (user: AdminUser) => {
    const roleToAssign = user.requested_role === "super_admin" ? "super_admin" : "unit_admin";
    const unitId = user.unit_ids?.[0] || null;
    if (!unitId && roleToAssign !== "super_admin") {
      toast.info("ผู้ใช้นี้ยังไม่ได้ระบุหน่วยบริการ กรุณาเลือกหน่วยบริการให้ก่อนอนุมัติสิทธิ์");
      openEditDialog(user);
      return;
    }
    approveMutation.mutate({
      userId: user.id,
      role: roleToAssign,
      unitId: unitId,
    });
  };

  const handleDelete = (userId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้? การกระทำนี้ไม่สามารถยกเลิกได้")) {
      deleteMutation.mutate({ userId });
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  if (isLoadingUsers) return <div className="p-8 text-center">กำลังโหลดข้อมูลผู้ใช้...</div>;

  const pendingCount =
    usersData?.users.filter((u) => !u.is_approved && u.has_submitted_registration).length || 0;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการผู้ใช้งาน (User Management)</h1>
          <p className="text-muted-foreground mt-1">
            ดูแลการอนุมัติสิทธิ์และหน่วยบริการของเจ้าหน้าที่ทั้งหมดในระบบ
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold">
            <Clock className="size-4 text-amber-600 animate-pulse" />
            <span>มีผู้ใช้รอการอนุมัติ {pendingCount} รายการ</span>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ข้อมูลผู้ใช้งาน</TableHead>
              <TableHead>สถานะ / ระดับสิทธิ์</TableHead>
              <TableHead>หน่วยบริการที่สังกัด</TableHead>
              <TableHead>วันที่สมัคร</TableHead>
              <TableHead className="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersData?.users.map((user) => {
              const assignedUnits = unitsData?.filter((u) => user.unit_ids?.includes(u.id)) || [];
              const isPending = !user.is_approved;

              return (
                <TableRow
                  key={user.id}
                  className={
                    isPending ? "bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20" : undefined
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <div className="font-semibold text-foreground text-sm">
                        {user.full_name || (
                          <span className="text-muted-foreground font-normal italic">
                            ยังไม่ระบุชื่อ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {user.email}
                      </div>
                      {(user.position || user.phone) && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                          {user.position && <span>ตำแหน่ง: {user.position}</span>}
                          {user.position && user.phone && <span>•</span>}
                          {user.phone && <span>โทร: {user.phone}</span>}
                        </div>
                      )}
                      {isPending && (
                        <span className="text-[11px] font-normal mt-1">
                          {user.has_submitted_registration ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              ยื่นขอสมัครเมื่อ {new Date(user.created_at).toLocaleDateString("th-TH")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              ล็อกอินเมื่อ {new Date(user.created_at).toLocaleDateString("th-TH")} (ยังไม่กรอกข้อมูล)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_approved ? (
                      user.role === "super_admin" ? (
                        <Badge variant="default" className="bg-purple-600">
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30"
                        >
                          Unit Admin
                        </Badge>
                      )
                    ) : user.has_submitted_registration ? (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 gap-1 font-semibold">
                          <Clock className="size-3" /> รออนุมัติสิทธิ์
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          ขอสิทธิ์:{" "}
                          {user.requested_role === "super_admin"
                            ? "Super Admin (สสจ.)"
                            : "Unit Admin"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-dashed gap-1 font-normal text-xs"
                        >
                          <Clock className="size-3" /> ยังไม่ส่งใบสมัคร
                        </Badge>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                          (ยังไม่เลือกหน่วยบริการ)
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignedUnits.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {assignedUnits.map((u) => (
                          <span
                            key={u.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full whitespace-nowrap"
                          >
                            {u.name} {u.district ? `(อ.${u.district})` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">{user.unit_name || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    {isPending && (
                      user.unit_ids && user.unit_ids.length > 0 ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                          disabled={approveMutation.isPending}
                          onClick={() => handleApprove(user)}
                        >
                          <UserCheck className="size-3.5 mr-1" />
                          อนุมัติสิทธิ์ (
                          {user.requested_role === "super_admin" ? "Super Admin" : "Unit Admin"})
                        </Button>
                      ) : user.requested_role === "super_admin" ? (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                          disabled={approveMutation.isPending}
                          onClick={() => handleApprove(user)}
                        >
                          <UserCheck className="size-3.5 mr-1" />
                          อนุมัติสิทธิ์ (Super Admin)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
                          onClick={() => openEditDialog(user)}
                        >
                          <UserCheck className="size-3.5 mr-1" />
                          ระบุหน่วยบริการเพื่ออนุมัติ
                        </Button>
                      )
                    )}
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      {isPending ? "กำหนดสิทธิ์อื่น" : "แก้ไขสิทธิ์"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                      {isPending ? "ปฏิเสธ" : "ลบ"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!usersData?.users || usersData.users.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  ไม่พบข้อมูลผู้ใช้งาน
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {isEditDialogOpen && selectedUser && (
        <EditUserDialog
          key={selectedUser.id}
          user={selectedUser}
          units={unitsData || []}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(data: {
            role: "super_admin" | "unit_admin";
            unitIds?: string[];
            fullName?: string;
            position?: string;
            phone?: string;
          }) =>
            updateMutation.mutate({ userId: selectedUser.id, ...data })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

interface EditUserDialogProps {
  user: AdminUser;
  units: UnitItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    role: "super_admin" | "unit_admin";
    unitIds: string[];
    fullName?: string;
    position?: string;
    phone?: string;
  }) => void;
  isPending: boolean;
}

function EditUserDialog({ user, units, isOpen, onClose, onSave, isPending }: EditUserDialogProps) {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [position, setPosition] = useState(user.position || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState<"super_admin" | "unit_admin">(
    user.role || (user.requested_role === "super_admin" ? "super_admin" : "unit_admin"),
  );
  const [unitIds, setUnitIds] = useState<string[]>(user.unit_ids || []);
  const [searchUnit, setSearchUnit] = useState("");

  const toggleUnit = (id: string) => {
    setUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const filteredUnits = units.filter(
    (u) =>
      u.name.toLowerCase().includes(searchUnit.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(searchUnit.toLowerCase())),
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {!user.is_approved ? "ระบุสิทธิ์และหน่วยบริการเพื่ออนุมัติ" : "แก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[75vh] overflow-y-auto px-1">
          {/* User Profile Fields (Editable) */}
          <div className="grid gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-foreground">ชื่อ-นามสกุล</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุลจริง"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-xs font-medium text-foreground">ตำแหน่งงาน</Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="เช่น เจ้าพนักงานพัสดุ"
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs font-medium text-foreground">เบอร์โทรศัพท์</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              <span>Google Account:</span>
              <span className="font-mono">{user.email}</span>
            </div>
            {!user.is_approved && (!user.unit_ids || user.unit_ids.length === 0) && (
              <div className="text-amber-700 dark:text-amber-400 font-medium pt-1 text-[11px]">
                * ผู้ใช้งานยังไม่ได้เลือกหน่วยบริการในแบบฟอร์ม กรุณาเลือกหน่วยบริการให้ด้านล่างนี้
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>ระดับสิทธิ์ (Role)</Label>
            <Select
              value={role}
              onValueChange={(val: "super_admin" | "unit_admin") => setRole(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกระดับสิทธิ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit_admin">Unit Admin (เจ้าหน้าที่ รพ. / รพ.สต.)</SelectItem>
                <SelectItem value="super_admin">Super Admin (แอดมิน สสจ.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>หน่วยบริการที่ดูแล (สำหรับ Unit Admin)</Label>
              {role === "unit_admin" && unitIds.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  เลือกแล้ว {unitIds.length} แห่ง
                </span>
              )}
            </div>
            {role === "super_admin" ? (
              <div className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-md">
                Super Admin มีสิทธิ์เข้าถึงทุกหน่วยบริการทั่วทั้งจังหวัดสระแก้ว
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาชื่อหน่วยบริการ หรืออำเภอ..."
                    value={searchUnit}
                    onChange={(e) => setSearchUnit(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="border rounded-md p-2.5 max-h-[200px] overflow-y-auto space-y-1.5">
                  {filteredUnits.map((u: UnitItem) => (
                    <div
                      key={u.id}
                      className="flex items-center space-x-2 py-1 px-1.5 rounded hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`unit-${u.id}`}
                        checked={unitIds.includes(u.id)}
                        onCheckedChange={() => toggleUnit(u.id)}
                      />
                      <Label
                        htmlFor={`unit-${u.id}`}
                        className="text-xs font-normal cursor-pointer leading-tight flex-1 flex items-center justify-between"
                      >
                        <span className="font-medium text-foreground">{u.name}</span>
                        {u.district && (
                          <span className="text-[11px] text-muted-foreground">อ.{u.district}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                  {filteredUnits.length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      ไม่พบหน่วยบริการที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              if (role === "unit_admin" && unitIds.length === 0) {
                toast.error("กรุณาเลือกหน่วยบริการอย่างน้อย 1 แห่งสำหรับ Unit Admin");
                return;
              }
              onSave({
                role,
                unitIds: role === "super_admin" ? [] : unitIds,
                fullName,
                position,
                phone,
              });
            }}
            disabled={isPending}
            className={!user.is_approved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            {isPending
              ? "กำลังบันทึก..."
              : !user.is_approved
                ? "อนุมัติและบันทึกสิทธิ์"
                : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
