# Mission: Full-Stack Audit and Debug of the Agent Financial Portal

## **Primary Objective:**
Perform a deep, multi-layered forensic audit and debugging of the entire user journey related to processing agent financial data from a JSON file. The audit must cover the entire stack (Frontend, Backend, UI/UX) and adhere strictly to the `PROTOCOL.md` guidelines.

---

## **Part 1: JSON File Processing Journey**

**Context:** The application's core feature is to upload a specific JSON file containing agent sales data.

**Key Questions to Investigate:**
1.  **File Structure Analysis:** Analyze the provided `agent_data.json` file. What is its structure? What are the key entities (agents, invoices, amounts)?
2.  **End-to-End Workflow Audit:** For the entire process of uploading and processing this JSON, evaluate the following workflow in the codebase across all three layers (Frontend, Backend, UI/UX):
    *   **Upload Mechanism:** Is the file upload component in the frontend robust and user-friendly?
    *   **Backend Processing:** Does the backend correctly parse the JSON, identify unique agents, and create or update agent profiles?
    *   **Financial Accounting:** Are invoice amounts correctly applied to each agent's accounting ledger?
    *   **Data Reflection:** Are the processed invoices correctly reflected in both the private agent profile and the public-facing agent portal?

---

## **Part 2: Feature-Specific Debugging & Verification**

**Context:** Several critical features are reportedly malfunctioning. A deep code analysis is required to identify the root cause.

**Specific Issues to Debug:**
1.  **Telegram Invoice Notification:**
    *   Verify the entire workflow for issuing and sending invoices to Telegram. Does it work reliably across the Frontend (trigger), Backend (logic and API call), and UI/UX (user feedback)?
2.  **Agent Financial Stats Box:**
    *   In the agent's profile, does the financial statistics box correctly reflect the `total_debt`, `total_sales`, and `total_payments` based on the accounting ledger?
3.  **Invoice Editing Functionality:**
    *   Does the invoice editing feature work correctly for both JSON-generated and manually created invoices?
    *   **CRITICAL:** After an invoice is edited, is the financial difference correctly updated in all accounting systems?
4.  **Payment Allocation System (High-Priority Bug):**
    *   **Problem:** The current system for payment allocation is failing. Payments are registered generally but are not being correctly assigned to specific invoice IDs, for both "automatic" and "manual" allocation modes.
    *   **Mandate:** Identify the root cause of this failure in the backend logic.
    *   **Proposed Solution Requirement:** Does a standardized and orderly mechanism exist for automatic allocation (e.g., FIFO - First-In, First-Out)? If not, propose one.

---

## **Part 3: Public Portal Verification**

**Context:** The public-facing portal is the final source of truth for the agents.

**Verification Point:**
*   Does the public portal accurately reflect all invoices, registered payments, and the final outstanding debt for each agent? Check for data consistency issues between the backend database and the public view.