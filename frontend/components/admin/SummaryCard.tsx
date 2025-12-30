import { FiUsers, FiDollarSign, FiPackage, FiTrendingUp } from "react-icons/fi";

export default function SummaryCard({
                                        title,
                                        value,
                                        icon,
                                        color
                                    }: {
    title: string;
    value: string | number;
    icon: "users" | "money" | "stock" | "growth";
    color: string;
}) {
    const icons = {
        users: <FiUsers className="text-4xl" />,
        money: <FiDollarSign className="text-4xl" />,
        stock: <FiPackage className="text-4xl" />,
        growth: <FiTrendingUp className="text-4xl" />
    };

    return (
        <div className={`bg-gradient-to-r ${color} p-8 rounded-3xl text-white shadow-2xl transform hover:scale-105 transition-all duration-300`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-lg opacity-90">{title}</p>
                    <p className="text-4xl font-black mt-3">{value}</p>
                </div>
                <div className="opacity-90">{icons[icon]}</div>
            </div>
        </div>
    );
}