import { NgModule } from '@angular/core';
import {
  TuiRoot,
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiTextfield,
  TuiError,
  TuiDataList,
  TuiLink,
  TuiNotification,
  TuiDialog,
  TuiAlert,
  TuiHint,
  TuiDropdown
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiStatus,
  TuiSwitch,
  TuiCheckbox,
  TuiPagination,
  TuiDataListWrapper,
  TuiSelect,
  TuiChip,
  TuiAvatar,
  TuiBreadcrumbs,
  TuiTabs,
  TuiProgress
} from '@taiga-ui/kit';
import { AgGridModule } from 'ag-grid-angular';

const TUI_MODULES: any[] = [
  TuiRoot,
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiTextfield,
  TuiError,
  TuiDataList,
  TuiLink,
  TuiNotification,
  TuiDialog,
  TuiAlert,
  TuiHint,
  TuiDropdown,
  TuiBadge,
  TuiStatus,
  TuiSwitch,
  TuiCheckbox,
  TuiPagination,
  TuiDataListWrapper,
  TuiSelect,
  TuiChip,
  TuiAvatar,
  TuiBreadcrumbs,
  TuiTabs,
  TuiProgress,
  AgGridModule
];

@NgModule({
  imports: TUI_MODULES,
  exports: TUI_MODULES
})
export class TaigaUiModule {}
