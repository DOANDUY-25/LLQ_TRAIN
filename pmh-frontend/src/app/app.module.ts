import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

import { ComponentFormComponent } from './shared/components/component-form/component-form.component';
import { DetailModalComponent } from './shared/components/detail-modal/detail-modal.component';
import { DataDiffModalComponent } from './shared/components/data-diff-modal/data-diff-modal.component';

import { GroupCategoryFormComponent } from './shared/components/group-category-form/group-category-form.component';
import { GroupCategoryDetailModalComponent } from './shared/components/group-category-detail-modal/group-category-detail-modal.component';

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

import { NG_EVENT_PLUGINS } from '@taiga-ui/event-plugins';
import { TaigaUiModule } from './shared/taiga-ui.module';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,

    ComponentFormComponent,
    DetailModalComponent,
    DataDiffModalComponent,

    GroupCategoryFormComponent,
    GroupCategoryDetailModalComponent,

    ComponentListComponent,
    ComponentDetailComponent,
    ComponentCreateComponent,
    ComponentEditComponent,
    ComponentCloneComponent,
    ComponentHistoryComponent,

    GroupCategoryListComponent,
    GroupCategoryCreateComponent,
    GroupCategoryEditComponent,
    GroupCategoryCloneComponent,
    GroupCategoryHistoryComponent,

    TransactionLogListComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    TaigaUiModule
  ],
  providers: [
    NG_EVENT_PLUGINS,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
