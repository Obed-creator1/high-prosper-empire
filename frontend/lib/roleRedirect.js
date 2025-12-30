export const getDashboardPathByRole = (role) => {
  switch (role) {
    case "ceo":
      return "/dashboard/ceo";
    case "admin":
      return "/dashboard/admin";
    case "collector":
      return "/dashboard/collector";
    case "hr":
      return "/dashboard/hr";
    case "account":
      return "/dashboard/account";
    default:
      return "/dashboard";
  }
};
