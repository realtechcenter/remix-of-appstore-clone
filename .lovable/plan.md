
## Fix Bulk Delete Confirmation Dialog

The current bulk delete (and single delete) confirmations use the browser's native `confirm()` dialog, which looks plain and inconsistent with the macOS-inspired design. We'll replace them with the styled `AlertDialog` component already in the project.

### Changes

**File: `src/components/admin/PaymentHistoryAdmin.tsx`**

1. **Import AlertDialog components** from `@/components/ui/alert-dialog` (AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel).

2. **Add state for dialog control**:
   - `showBulkDeleteDialog` (boolean) — controls the bulk delete confirmation
   - `singleDeleteId` (string | null) — controls single-row delete confirmation

3. **Replace `confirm()` for bulk delete** (line 118):
   - Remove the `confirm()` call from `handleBulkDelete`
   - Instead, the "Delete X selected" button opens the AlertDialog
   - The AlertDialog shows a warning message with the count of selected items
   - "Cancel" closes the dialog; "Delete" triggers `bulkDeleteMutation.mutate()`

4. **Replace `confirm()` for single delete** (line 292):
   - The trash icon button sets `singleDeleteId` to open the dialog
   - The AlertDialog confirms deletion of that specific order
   - "Delete" triggers `deleteMutation.mutate(singleDeleteId)`

5. **Styled dialog** will use the existing AlertDialog component with:
   - Destructive-styled action button (red)
   - Clear warning text about irreversibility
   - Consistent with the app's macOS-inspired design language
