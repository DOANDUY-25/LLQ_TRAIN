import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import {
  GroupCategoryRequestDTO,
  GroupCategoryStatus
} from '../../../models/group-category.model';
import { GroupCategoryService } from '../../../core/services/group-category.service';
import { ComponentService } from '../../../core/services/component.service';

/**
 * Shared form cho module Tham số danh mục theo nhóm.
 * Mode: 'create' | 'edit' | 'clone' | 'view'
 */
@Component({
  selector: 'app-group-category-form',
  templateUrl: './group-category-form.component.html',
  styleUrls: ['./group-category-form.component.scss']
})
export class GroupCategoryFormComponent implements OnInit, OnChanges {

  @Input() mode: 'create' | 'edit' | 'clone' | 'view' = 'create';
  @Input() initialData?: GroupCategoryRequestDTO;
  @Input() currentStatus?: GroupCategoryStatus;

  /** Emit khi nhấn Lưu */
  @Output() formSubmit = new EventEmitter<GroupCategoryRequestDTO>();
  /** Emit khi nhấn Lưu và gửi duyệt */
  @Output() formSubmitAndApprove = new EventEmitter<GroupCategoryRequestDTO>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  isReadOnly = false;

  /** Options cho select Cấu phần xử lý */
  componentCodeOptions: string[] = [];
  loadingComponents = false;

  /** Trạng thái kiểm tra trùng */
  checkingDuplicate = false;
  isDuplicate = false;

  constructor(
    private fb: FormBuilder,
    private groupCategoryService: GroupCategoryService,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.updateFormState();
    this.loadComponentCodes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.form) {
      this.patchFormData();
    }
    if (changes['mode'] && this.form) {
      this.updateFormState();
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  private initForm(): void {
    this.form = this.fb.group({
      paramType: ['', [
        Validators.required,
        Validators.maxLength(255)
      ]],
      paramValue: ['', [
        Validators.required,
        Validators.maxLength(255)
      ]],
      paramName: ['', [
        Validators.required,
        Validators.maxLength(255)
      ]],
      description: ['', [Validators.maxLength(4000)]],
      componentCode: ['', [Validators.required]],
      effectiveDate: ['', [Validators.required]],
      endEffectiveDate: ['']
    });
    this.patchFormData();
  }

  private patchFormData(): void {
    if (!this.initialData || !this.form) return;
    this.form.patchValue({
      paramType:        this.initialData.paramType        ?? '',
      paramValue:       this.initialData.paramValue       ?? '',
      paramName:        this.mode === 'clone' ? '' : (this.initialData.paramName ?? ''),
      description:      this.initialData.description      ?? '',
      componentCode:    this.initialData.componentCode    ?? '',
      effectiveDate:    this.initialData.effectiveDate
                          ? this.toDatetimeLocal(this.initialData.effectiveDate) : '',
      endEffectiveDate: this.initialData.endEffectiveDate
                          ? this.toDatetimeLocal(this.initialData.endEffectiveDate) : ''
    });
    this.isDuplicate = false;
  }

  private toDatetimeLocal(iso: string): string {
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  }

  private updateFormState(): void {
    if (!this.form) return;
    this.isReadOnly = this.mode === 'view';
    if (this.isReadOnly) {
      this.form.disable();
    } else {
      this.form.enable();
      // Khi sửa: Danh mục theo nhóm + Giá trị thành phần là readonly
      if (this.mode === 'edit') {
        this.form.get('paramType')?.disable();
        this.form.get('paramValue')?.disable();
      }
    }
  }

  private loadComponentCodes(): void {
    this.loadingComponents = true;
    this.componentService.getDistinctCodes().subscribe({
      next: res => {
        this.componentCodeOptions = res.success && res.data ? res.data : [];
        this.loadingComponents = false;
      },
      error: () => { this.loadingComponents = false; }
    });
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /** Validate ngày hiệu lực không được trong quá khứ (bỏ qua khi clone) */
  validateEffectiveDate(): void {
    const ctrl = this.form.get('effectiveDate');
    if (!ctrl?.value) return;
    const selected = new Date(ctrl.value);
    const errors = { ...(ctrl.errors ?? {}) };
    // Clone: không kiểm tra ngày quá khứ vì ngày lấy từ bản ghi nguồn
    if (this.mode !== 'clone' && selected < new Date(Date.now() - 5 * 60 * 1000)) {
      errors['pastDate'] = true;
    } else {
      delete errors['pastDate'];
    }
    ctrl.setErrors(Object.keys(errors).length ? errors : null);
    this.validateEndDate();
  }

  /** Validate ngày hết hiệu lực >= ngày hiệu lực */
  validateEndDate(): void {
    const startCtrl = this.form.get('effectiveDate');
    const endCtrl   = this.form.get('endEffectiveDate');
    if (!startCtrl?.value || !endCtrl?.value) return;
    const errors = { ...(endCtrl.errors ?? {}) };
    if (new Date(endCtrl.value) < new Date(startCtrl.value)) {
      errors['beforeStart'] = true;
    } else {
      delete errors['beforeStart'];
    }
    endCtrl.setErrors(Object.keys(errors).length ? errors : null);
  }

  /** Kiểm tra trùng khi blur khỏi paramName / paramType / componentCode */
  checkDuplicate(): void {
    if (this.mode === 'edit') return;
    const { paramName, paramType, componentCode } = this.form.getRawValue();
    if (!paramName || !paramType || !componentCode) return;

    this.checkingDuplicate = true;
    this.isDuplicate = false;

    // Tìm kiếm exact match bằng search API
    this.groupCategoryService.search(
      { paramName: paramName.trim(), statuses: [] }, 0, 50
    ).subscribe({
      next: res => {
        if (res.success && res.data) {
          const found = res.data.content.some(
            g =>
              g.paramName?.toUpperCase()     === paramName.toUpperCase().trim() &&
              g.paramType?.toUpperCase()     === paramType.toUpperCase().trim() &&
              g.componentCode?.toUpperCase() === componentCode.toUpperCase().trim()
          );
          this.isDuplicate = found;
          if (found) {
            this.form.get('paramName')?.setErrors({ duplicate: true });
          }
        }
        this.checkingDuplicate = false;
      },
      error: () => { this.checkingDuplicate = false; }
    });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  /** Gọi từ parent qua @ViewChild */
  triggerSubmit(withApproval: boolean): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isDuplicate) return;
    const dto = this.buildDto();
    withApproval ? this.formSubmitAndApprove.emit(dto) : this.formSubmit.emit(dto);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isDuplicate) return;
    this.formSubmit.emit(this.buildDto());
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  private buildDto(): GroupCategoryRequestDTO {
    const v = this.form.getRawValue();
    return {
      paramType:        (v.paramType       ?? '').trim(),
      paramValue:       (v.paramValue      ?? '').trim(),
      paramName:        (v.paramName       ?? '').trim(),
      description:      v.description      || undefined,
      componentCode:    (v.componentCode   ?? '').trim().toUpperCase(),
      effectiveDate:    v.effectiveDate    ? new Date(v.effectiveDate).toISOString()    : '',
      endEffectiveDate: v.endEffectiveDate ? new Date(v.endEffectiveDate).toISOString() : undefined
    };
  }

  // ─── Error helpers ─────────────────────────────────────────────────────────

  isFieldError(name: string): boolean {
    const f = this.form.get(name);
    return !!(f?.invalid && f?.touched);
  }

  getErrorMessage(name: string): string {
    const f = this.form.get(name);
    if (!f) return '';
    if (f.hasError('required'))     return 'Trường này là bắt buộc';
    if (f.hasError('maxlength')) {
      const max = f.errors?.['maxlength']?.requiredLength;
      return `Tối đa ${max} ký tự`;
    }
    if (f.hasError('duplicate'))    return 'Tham số đã tồn tại với cùng Loại và Cấu phần';
    if (f.hasError('pastDate'))     return 'Ngày hiệu lực không hợp lệ (không được là quá khứ)';
    if (f.hasError('beforeStart'))  return 'Ngày hết hiệu lực phải ≥ Ngày hiệu lực';
    return '';
  }

  /** Đếm ký tự textarea */
  charCount(name: string): number {
    return (this.form.get(name)?.value ?? '').length;
  }
}
