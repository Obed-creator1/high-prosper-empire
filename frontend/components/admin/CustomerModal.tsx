import Modal from "@/components/Modal";
import CustomerForm from "@/components/admin/CustomerForm"; // Your existing Modal component

export default function CustomerModal({
                                          open,
                                          customer,
                                          onClose,
                                          onSave
                                      }: {
    open: boolean;
    customer: any;
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    return (
        <Modal
            open={open}
            title={customer ? "Edit Customer" : "Add New Customer"}
            onClose={onClose}
        >
            <div className="max-w-2xl mx-auto">
                <CustomerForm
                    customer={customer}
                    onSave={onSave}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
}