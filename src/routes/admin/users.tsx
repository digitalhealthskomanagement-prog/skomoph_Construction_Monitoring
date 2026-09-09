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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserCheck, Clock, UserX } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const approveUserFn = useServerFn(approveUser);
  const updateUserRoleFn = useServerFn(updateUserRole);
  const deleteUserFn = useServerFn(deleteUser);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => getAllUsers(),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: () => getAllUnitsData(),
  });

  const approveMutation = useMutation({
    mutationFn: (vars: { userId: string; role: "super_admin" | "unit_admin"; unitId?: string | null }) =>
      approveUserFn({ data: vars }),
    onSuccess: () => {
      toast.success("อนุมัติสิทธิ์ผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: any) => {
      toast.error(`เกิดข้อผิดพลาดในการอนุมัติ: ${err.message || err}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { userId: string; role: "super_admin" | "unit_admin"; unitIds?: string[] }) =>
      updateUserRoleFn({ data: vars }),
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setIsEditDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(`เกิดข้อผิดพลาด: ${err.message || err}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { userId: string }) =>
      deleteUserFn({ data: vars }),
    onSuccess: () => {
      toast.success("ลบผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err: any) => {
      toast.error(`เกิดข้อผิดพลาดในการลบ: ${err.message || err}`);
    },
  });

  const handleApprove = (user: any) => {
    const roleToAssign = user.requested_role === "super_admin" ? "super_admin" : "unit_admin";
    const unitId = user.unit_ids?.[0] || null;
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

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  if (isLoadingUsers) return <div className="p-8 text-center">กำลังโหลดข้อมูลผู้ใช้...</div>;

  const pendingCount = usersData?.users.filter(u => !u.is_approved).length || 0;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการผู้ใช้งาน (User Management)</h1>
          <p className="text-muted-foreground mt-1">ดูแลการอนุมัติสิทธิ์และหน่วยบริการของเจ้าหน้าที่ทั้งหมดในระบบ</p>
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
              <TableHead>อีเมล</TableHead>
              <TableHead>สถานะ / ระดับสิทธิ์</TableHead>
              <TableHead>หน่วยบริการที่สังกัด</TableHead>
              <TableHead>วันที่สมัคร</TableHead>
              <TableHead className="text-right">การจัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersData?.users.map((user) => {
              const assignedUnits = unitsData?.filter(u => user.unit_ids?.includes(u.id)) || [];
              const isPending = !user.is_approved;

              return (
                <TableRow key={user.id} className={isPending ? "bg-amber-50/50 hover:bg-amber-50" : undefined}>
                  <TableCell className="font-medium">
                    <div>{user.email}</div>
                    {isPending && (
                      <span className="text-[11px] text-amber-700 font-normal">
                        ยื่นขอสมัครเมื่อ {new Date(user.created_at).toLocaleDateString("th-TH")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_approved ? (
                      user.role === "super_admin" ? (
                        <Badge variant="default" className="bg-purple-600">Super Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Unit Admin</Badge>
                      )
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 font-semibold">
                          <Clock className="size-3" /> รออนุมัติสิทธิ์
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          ขอสิทธิ์: {user.requested_role === "super_admin" ? "Super Admin (สสจ.)" : "Unit Admin"}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignedUnits.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {assignedUnits.map(u => (
                          <span key={u.id} className="text-xs bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                            {u.name} {u.district ? `(อ.${u.district})` : ""}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">-</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    {isPending && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                        disabled={approveMutation.isPending}
                        onClick={() => handleApprove(user)}
                      >
                        <UserCheck className="size-3.5 mr-1" />
                        อนุมัติสิทธิ์ ({user.requested_role === "super_admin" ? "Super Admin" : "Unit Admin"})
                      </Button>
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
          user={selectedUser} 
          units={unitsData || []} 
          isOpen={isEditDialogOpen} 
          onClose={() => setIsEditDialogOpen(false)} 
          onSave={(data: any) => updateMutation.mutate({ userId: selectedUser.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditUserDialog({ user, units, isOpen, onClose, onSave, isPending }: any) {
  const [role, setRole] = useState(user.role || "unit_admin");
  const [unitIds, setUnitIds] = useState<string[]>(user.unit_ids || []);

  const toggleUnit = (id: string) => {
    setUnitIds(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>แก้ไขสิทธิ์ผู้ใช้งาน</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>อีเมล</Label>
            <div className="p-2 bg-muted rounded-md text-sm">{user.email}</div>
          </div>
          
          <div className="grid gap-2">
            <Label>ระดับสิทธิ์ (Role)</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกระดับสิทธิ์" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit_admin">Unit Admin (เจ้าหน้าที่ รพ.)</SelectItem>
                <SelectItem value="super_admin">Super Admin (แอดมิน สสจ.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>หน่วยบริการที่ดูแล (สำหรับ Unit Admin)</Label>
            {role === "super_admin" ? (
              <div className="text-sm text-muted-foreground italic">Super Admin มีสิทธิ์เข้าถึงทุกหน่วยบริการ</div>
            ) : (
              <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
                {units.map((u: any) => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`unit-${u.id}`} 
                      checked={unitIds.includes(u.id)}
                      onCheckedChange={() => toggleUnit(u.id)}
                    />
                    <Label htmlFor={`unit-${u.id}`} className="text-sm font-normal cursor-pointer leading-none">
                      {u.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>ยกเลิก</Button>
          <Button onClick={() => onSave({ role, unitIds: role === "super_admin" ? [] : unitIds })} disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
