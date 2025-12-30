import Modal from "@/components/Modal";
import UserForm from "@/components/admin/UserForm"; // Your global modal

export default function UserModal({
                                      open,
                                      user,
                                      onClose,
                                      onSave
                                  }: {
    open: boolean;
    user: any;
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    return (
        <Modal open={open} title={user ? "Edit User" : "Create New User"} onClose={onClose}>
            <UserForm user={user} onSave={onSave} onCancel={onClose} />
        </Modal>
    );
}