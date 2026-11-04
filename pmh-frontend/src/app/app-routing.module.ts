import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ComponentListComponent } from './features/components/component-list/component-list.component';
import { ComponentDetailComponent } from './features/components/component-detail/component-detail.component';
import { ComponentCreateComponent } from './features/components/component-create/component-create.component';
import { ComponentEditComponent } from './features/components/component-edit/component-edit.component';
import { ComponentCloneComponent } from './features/components/component-clone/component-clone.component';
import { ComponentHistoryComponent } from './features/components/component-history/component-history.component';
import { GroupCategoryListComponent } from './features/group-categories/group-category-list/group-category-list.component';
import { GroupCategoryCreateComponent } from './features/group-categories/group-category-create/group-category-create.component';
import { GroupCategoryEditComponent } from './features/group-categories/group-category-edit/group-category-edit.component';
import { GroupCategoryCloneComponent } from './features/group-categories/group-category-clone/group-category-clone.component';
import { GroupCategoryHistoryComponent } from './features/group-categories/group-category-history/group-category-history.component';
import { TransactionLogListComponent } from './features/transaction-logs/transaction-log-list/transaction-log-list.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: '/components', pathMatch: 'full' },
  { path: 'components', component: ComponentListComponent, canActivate: [AuthGuard] },
  { path: 'components/create', component: ComponentCreateComponent, canActivate: [AuthGuard] },
  { path: 'components/:id', component: ComponentDetailComponent, canActivate: [AuthGuard] },
  { path: 'components/:id/edit', component: ComponentEditComponent, canActivate: [AuthGuard] },
  { path: 'components/:id/clone', component: ComponentCloneComponent, canActivate: [AuthGuard] },
  { path: 'components/:id/history', component: ComponentHistoryComponent, canActivate: [AuthGuard] },
  { path: 'group-categories', component: GroupCategoryListComponent, canActivate: [AuthGuard] },
  { path: 'group-categories/create', component: GroupCategoryCreateComponent, canActivate: [AuthGuard] },
  { path: 'group-categories/:id/edit', component: GroupCategoryEditComponent, canActivate: [AuthGuard] },
  { path: 'group-categories/:id/clone', component: GroupCategoryCloneComponent, canActivate: [AuthGuard] },
  { path: 'group-categories/:id/history', component: GroupCategoryHistoryComponent, canActivate: [AuthGuard] },
  { path: 'transaction-logs', component: TransactionLogListComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/components' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
