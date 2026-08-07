import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, updateUserRole, deleteUser } from "@/lib/admin.functions";
import { getAllProjectsData } from "@/lib/data.functions";
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

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getAllProjectsData(),
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
              const project = projectsData?.find(p => p.id === user.project_id);
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
                    {project ? project.unit_name : <span className="text-muted-foreground">-</span>}
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
          projects={projectsData || []} 
          isOpen={isEditDialogOpen} 
          onClose={() => setIsEditDialogOpen(false)} 
          onSave={(data) => updateMutation.mutate({ userId: selectedUser.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditUserDialog({ user, projects, isOpen, onClose, onSave, isPending }: any) {
  const [role, setRole] = useState(user.role || "unit_admin");
  const [projectId, setProjectId] = useState(user.project_id || "none");

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
            <Select value={projectId} onValueChange={setProjectId} disabled={role === "super_admin"}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหน่วยบริการ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">- ไม่ระบุ -</SelectItem>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.unit_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>ยกเลิก</Button>
          <Button onClick={() => onSave({ role, projectId: projectId === "none" ? null : projectId })} disabled={isPending}>
            {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
