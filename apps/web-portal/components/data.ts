export const claimStatuses = [
  "Draft",
  "Accident Reported",
  "Documents Pending",
  "Documents Submitted",
  "Claim Intimated",
  "Surveyor Appointed",
  "Vehicle Inspected",
  "Estimate Submitted",
  "Approval Pending",
  "Repair Started",
  "Repair Completed",
  "Final Bill Submitted",
  "Settlement Under Process",
  "Settled",
  "Rejected",
  "Closed"
] as const;

export type ClaimStatus = (typeof claimStatuses)[number];

export const navItems = [
  ["Dashboard", "/dashboard", "▦"],
  ["Customers", "/customers", "◉"],
  ["Vehicles", "/vehicles", "▣"],
  ["Policies", "/policies", "◫"],
  ["Claims", "/claims", "◆"],
  ["Documents", "/documents", "◧"],
  ["Timeline", "/timeline", "◷"],
  ["Tasks", "/tasks", "✓"],
  ["Reports", "/reports", "▥"],
  ["Users", "/users", "●"]
] as const;
