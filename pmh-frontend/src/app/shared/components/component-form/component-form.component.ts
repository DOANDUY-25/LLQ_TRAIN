import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { ComponentRequestDTO, ComponentStatus } from '../../../models/component.model';
import { ComponentService } from '../../../core/services/component.service';

/**
 * Component Form tái sử dụng cho:
 * - Thêm mới (create)
 * - Sửa (edit)
 * - Sao chép (clone)
 * - Xem (view)
 *
 * Validation theo SRD section 2.2
 */
@Component({
  selector: 'app-component-form',
  templateUrl: './component-form.component.html',
  styleUrls: ['./component-form.component.css']
})
export class ComponentFormComponent implements OnInit, OnChanges {
  @Input() mode: 'create' | 'edit' | 'clone' | 'view' = 'create';
  @Input() initialData?: ComponentRequestDTO;
  @Input() currentStatus?: ComponentStatus;

  @Output() formSubmit = new EventEmitter<ComponentRequestDTO>();
  @Output() formSubmitAndApprove = new EventEmitter<ComponentRequestDTO>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  isReadOnly = false;

  // Trạng thái check trùng mã
  checkingCode = false;
  codeDuplicate = false;

  messageTypeOptions: string[] = ['ISO2022', 'ISO15022', 'ISO20022'];
  connectionMethodOptions: string[] = ['API', 'SOAP', 'REST', 'MQ'];

  constructor(
    private fb: FormBuilder,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.updateFormState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData'] && this.form) {
      this.patchFormData();
    }
    if (changes['mode'] && this.form) {
      this.updateFormState();
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      componentCode: [
        { value: '', disabled: false },
        [
          Validators.required,
          Validators.maxLength(20),
          this.componentCodeValidator()
        ]
      ],
      componentName: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
          this.noSpecialCharsValidator()
        ]
      ],
      messageType: [''],
      connectionMethod: [''],
      checkToken: [false],
      effectiveDate: ['', [Validators.required]],
      endEffectiveDate: ['']
    });

    this.patchFormData();
  }

  private patchFormData(): void {
    if (!this.initialData || !this.form) return;

    this.form.patchValue({
      componentCode: this.initialData.componentCode || '',
      componentName: this.initialData.componentName || '',
      messageType: this.initialData.messageType || '',
      connectionMethod: this.initialData.connectionMethod || '',
      checkToken: this.initialData.checkToken === 'Y',
      effectiveDate: this.initialData.effectiveDate
        ? this.toLocalDatetimeString(this.initialData.effectiveDate)
        : '',
      endEffectiveDate: this.initialData.endEffectiveDate
        ? this.toLocalDatetimeString(this.initialData.endEffectiveDate)
        : ''
    });
    this.codeDuplicate = false;
  }

  private toLocalDatetimeString(isoString: string): string {
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  private updateFormState(): void {
    if (!this.form) return;
    this.isReadOnly = this.mode === 'view';

    if (this.isReadOnly) {
      this.form.disable();
    } else {
      this.form.enable();
      if (this.mode === 'edit') {
        // Khi sửa: mã là readonly
        this.form.get('componentCode')?.disable();
      }
      if (this.mode === 'clone') {
        // Khi sao chép: cho nhập mã mới
        this.form.get('componentCode')?.enable();
        this.form.get('componentCode')?.setValue('');
        this.codeDuplicate = false;
      }
    }
  }

  /**
   * Mã cấu phần:
   *  - Chỉ chữ HOA A-Z, số 0-9, dấu gạch dưới
   *  - Không khoảng trắng, không tiếng Việt, không ký tự đặc biệt
   */
  private componentCodeValidator() {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const v: string = ctrl.value ?? '';
      if (!v) return null;

      // Phát hiện khoảng trắng
      if (/\s/.test(v)) return { hasSpace: true };

      // Phát hiện chữ thường (tiếng Việt hoặc Latin thường)
      if (/[a-z]/.test(v)) return { hasLowercase: true };

      // Phát hiện ký tự Unicode ngoài ASCII (tiếng Việt có dấu)
      // eslint-disable-next-line no-control-regex
      if (/[^\x00-\x7F]/.test(v)) return { hasVietnamese: true };

      // Chỉ cho phép A-Z, 0-9, dấu _
      if (!/^[A-Z0-9_]+$/.test(v)) return { invalidChars: true };

      return null;
    };
  }

  /**
   * Tên cấu phần: không cho phép ký tự đặc biệt theo danh sách SRD
   */
  private noSpecialCharsValidator() {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      if (!ctrl.value) return null;
      const forbidden = /[\\^#|*@$`~!%&{}\[\]?<>"'(),\/\:;=]/;
      return forbidden.test(ctrl.value) ? { specialChars: true } : null;
    };
  }


  /**
   * Auto-uppercase khi nhập Mã cấu phần
   */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const pos = input.selectionStart ?? 0;
    const upper = input.value.toUpperCase();
    if (input.value !== upper) {
      input.value = upper;
      this.form.get('componentCode')?.setValue(upper, { emitEvent: false });
      // Giữ vị trí con trỏ
      requestAnimationFrame(() => input.setSelectionRange(pos, pos));
    }
    this.codeDuplicate = false;
  }

  /**
   * Khi rời khỏi trường Mã cấu phần → kiểm tra trùng
   */
  onCodeBlur(): void {
    const ctrl = this.form.get('componentCode');
    if (!ctrl || ctrl.invalid || !ctrl.value) return;
    if (this.mode === 'edit') return; // edit thì mã không đổi

    this.checkCodeDuplicate(ctrl.value);
  }

  private checkCodeDuplicate(code: string): void {
    this.checkingCode = true;
    this.codeDuplicate = false;

    this.componentService.search({ componentCodes: [code] }, 0, 1).subscribe({
      next: (res) => {
        if (res.success && res.data?.totalElements > 0) {
          this.codeDuplicate = true;
          this.form.get('componentCode')?.setErrors({ duplicate: true });
        }
        this.checkingCode = false;
      },
      error: () => { this.checkingCode = false; }
    });
  }

  /**
   * Validate ngày hiệu lực không được quá khứ
   */
  validateEffectiveDate(): void {
    const ctrl = this.form.get('effectiveDate');
    if (!ctrl?.value) return;

    const selected = new Date(ctrl.value);
    const now = new Date();
    // Cho sai số 5 phút
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const errors = { ...(ctrl.errors ?? {}) };
    if (selected < fiveMinutesAgo) {
      errors['pastDate'] = true;
    } else {
      delete errors['pastDate'];
    }
    ctrl.setErrors(Object.keys(errors).length ? errors : null);

    // Re-validate end date
    this.validateEndEffectiveDate();
  }

  /**
   * Validate ngày hết hiệu lực >= ngày hiệu lực
   */
  validateEndEffectiveDate(): void {
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

  /**
   * Gọi từ parent qua ViewChild
   */
  triggerSubmit(withApproval: boolean): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.codeDuplicate) return;

    const dto = this.buildDto();
    if (withApproval) {
      this.formSubmitAndApprove.emit(dto);
    } else {
      this.formSubmit.emit(dto);
    }
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.codeDuplicate) return;
    this.formSubmit.emit(this.buildDto());
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  private buildDto(): ComponentRequestDTO {
    const v = this.form.getRawValue();
    return {
      componentCode:     (v.componentCode ?? '').toUpperCase().trim(),
      componentName:     (v.componentName ?? '').trim(),
      messageType:       v.messageType       || undefined,
      connectionMethod:  v.connectionMethod  || undefined,
      checkToken:        v.checkToken ? 'Y' : 'N',
      effectiveDate:     v.effectiveDate    ? new Date(v.effectiveDate).toISOString()    : '',
      endEffectiveDate:  v.endEffectiveDate ? new Date(v.endEffectiveDate).toISOString() : undefined
    };
  }


  hasError(fieldName: string, errorType: string): boolean {
    const f = this.form.get(fieldName);
    return !!(f?.hasError(errorType) && f?.touched);
  }

  /** Kiểm tra field có đang lỗi (bất kỳ lỗi nào) và đã touched */
  isFieldError(fieldName: string): boolean {
    const f = this.form.get(fieldName);
    return !!(f?.invalid && f?.touched);
  }

  getErrorMessage(fieldName: string): string {
    const f = this.form.get(fieldName);
    if (!f) return '';

    if (f.hasError('required'))       return 'Trường này là bắt buộc';
    if (f.hasError('maxlength')) {
      const req = f.errors?.['maxlength']?.requiredLength;
      return `Vượt quá độ dài tối đa ${req} ký tự`;
    }
    if (f.hasError('hasSpace'))       return 'Mã cấu phần không được chứa khoảng trắng';
    if (f.hasError('hasLowercase'))   return 'Mã cấu phần chỉ được nhập chữ HOA';
    if (f.hasError('hasVietnamese'))  return 'Mã cấu phần không được chứa ký tự tiếng Việt';
    if (f.hasError('invalidChars'))   return 'Mã cấu phần chỉ cho phép chữ HOA, số và dấu gạch dưới (_)';
    if (f.hasError('duplicate'))      return 'Mã cấu phần đã tồn tại trong hệ thống';
    if (f.hasError('pattern'))        return 'Mã cấu phần chỉ cho phép chữ HOA và số';
    if (f.hasError('specialChars'))   return 'Tên không được chứa ký tự đặc biệt: ^ # | * @ $ ` ~ ! % & { } [ ] ? < > " \' ( ) , / : ; \\ =';
    if (f.hasError('pastDate'))       return 'Ngày hiệu lực không hợp lệ — không được là ngày quá khứ';
    if (f.hasError('beforeStart'))    return 'Ngày hết hiệu lực phải lớn hơn hoặc bằng Ngày hiệu lực';

    return '';
  }
}
