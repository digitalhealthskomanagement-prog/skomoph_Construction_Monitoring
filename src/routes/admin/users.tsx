import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, updateUserRole, deleteUser } from "@/lib/admin.functions";
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

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => getAllUsers(),
  });

  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: () => getAllUnitsData(),
  });

  const updateMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      toast.success("อัปเดตข้อมูลผู้ใช้สำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      setIsEditDialogOpen(false);
    },
    onError: (err) => {
      toast.error(`เกิดข้อผิดพลาด: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("ลบผู้ใช้งานสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (err) => {
      toast.error(`เกิดข้อผิดพลาดในการลบ: ${err.message}`);
    },
  });

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

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการผู้ใช้งาน (User Management)</h1>
          <p className="text-muted-foreground mt-2">ดูแลสิทธิ์และหน่วยบริการของเจ้าหน้าที่ทั้งหมดในระบบ</p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>อีเมล</TableHead>
              <TableHead>ระดับสิทธิ์</TableHead>
              <TableHead>หน่วยบริการที่ดูแล</TableHead>
              <TableHead>วันที่สมัคร</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersData?.users.map((user) => {
              const assignedUnits = unitsData?.filter(u => user.unit_ids?.includes(u.id)) || [];
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.role === "super_admin" ? (
                      <Badge variant="default" className="bg-purple-600">Super Admin</Badge>
                    ) : user.role === "unit_admin" ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Unit Admin</Badge>
                    ) : (
                      <Badge variant="secondary">รอกำหนดสิทธิ์</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignedUnits.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {assignedUnits.map(u => (
                          <span key={u.id} className="text-xs bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">
                            {u.name}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString("th-TH")}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                      แก้ไขสิทธิ์
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(user.id)}>
                      ลบ
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
          onSave={(data) => updateMutation.mutate({ userId: selectedUser.id, ...data })}
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
