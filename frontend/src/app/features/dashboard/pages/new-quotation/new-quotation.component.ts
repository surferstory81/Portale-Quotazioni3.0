import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  CreateQuotationPayload,
  QuotationFormField,
  QuotationFormSection,
} from '../../models/quotation.models';
import { QuotationFormConfigService } from '../../services/quotation-form-config.service';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-new-quotation',
  templateUrl: './new-quotation.component.html',
  styleUrl: './new-quotation.component.scss',
})
export class NewQuotationComponent implements OnInit, OnDestroy {
  readonly sections: QuotationFormSection[] = this.formConfigService.getSections();
  readonly form: UntypedFormGroup = this.buildForm();

  get impactField(): QuotationFormField | undefined {
    const infraSection = this.sections.find(s => s.title === 'Infrastruttura');
    return infraSection?.fields.find(f => f.key === 'impactEntity');
  }

  isSubmitting = false;
  isSavingDraft = false;
  successMessage = '';
  errorMessage = '';
  autoSaveMessage = '';

  // Draft management
  draftId: string | null = null;
  isDraftMode = false;
  private autoSaveEnabled = false;
  private destroy$ = new Subject<void>();

  private readonly numberFields = new Set<string>([
    'serviceVolumesPerDay',
    'expectedReleases',
    'microservicesCount',
    'storageGb',
    'computeCores',
    'scheduledBatches',
  ]);

  constructor(
    private readonly formConfigService: QuotationFormConfigService,
    private readonly quotationsService: QuotationsService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Check if editing an existing draft
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const draftId = params['draftId'] as string | undefined;
      if (draftId) {
        this.loadDraft(draftId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    // Re-enable validators for submission
    this.enableAllValidators();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Compila tutti i campi obbligatori prima di inviare la quotazione.';
      return;
    }

    this.isSubmitting = true;

    const payload = this.normalizePayload(
      this.form.getRawValue() as Record<string, unknown>,
    );

    // If editing a draft, submit it; otherwise create new quotation
    const request = this.draftId
      ? this.quotationsService.submitDraft(this.draftId)
      : this.quotationsService.create(payload);

    request
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.restoreCheckboxDefaults();
          void this.router.navigate(['/dashboard/quotations/status']);
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }

  onSaveDraft(): void {
    this.successMessage = '';
    this.errorMessage = '';

    // Temporarily disable validators for draft save
    this.disableAllValidators();

    this.isSavingDraft = true;

    const payload = this.normalizePayload(
      this.form.getRawValue() as Record<string, unknown>,
    );

    const request = this.draftId
      ? this.quotationsService.updateDraft(this.draftId, payload)
      : this.quotationsService.saveDraft(payload);

    request
      .pipe(finalize(() => (this.isSavingDraft = false)))
      .subscribe({
        next: (draft) => {
          if (!this.draftId) {
            this.draftId = draft.id;
            this.isDraftMode = true;
            this.enableAutoSave();
          }
          this.successMessage = 'Bozza salvata con successo';
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }

  private loadDraft(draftId: string): void {
    this.quotationsService.list().subscribe({
      next: (quotations) => {
        const draft = quotations.find(q => q.id === draftId && q.status === 'BOZZA');
        if (draft && draft.formData) {
          this.draftId = draft.id;
          this.isDraftMode = true;
          this.populateFormFromDraft(draft.formData);
          this.enableAutoSave();
        }
      },
      error: () => {
        this.errorMessage = 'Impossibile caricare la bozza';
      }
    });
  }

  private populateFormFromDraft(formData: Record<string, unknown>): void {
    Object.entries(formData).forEach(([key, value]) => {
      const control = this.form.get(key);
      if (control) {
        control.setValue(value);
      }
    });
  }

  private enableAutoSave(): void {
    if (this.autoSaveEnabled) return;

    this.autoSaveEnabled = true;

    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(5000), // Auto-save after 5 seconds of inactivity
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => {
        if (this.draftId && !this.isSubmitting && !this.isSavingDraft) {
          this.autoSave();
        }
      });
  }

  private autoSave(): void {
    // Temporarily disable validators for auto-save
    this.disableAllValidators();

    const payload = this.normalizePayload(
      this.form.getRawValue() as Record<string, unknown>,
    );

    this.quotationsService.updateDraft(this.draftId!, payload).subscribe({
      next: () => {
        this.autoSaveMessage = 'Salvato automaticamente';
        setTimeout(() => (this.autoSaveMessage = ''), 2000);
      },
      error: () => {
        // Silently fail auto-save
      }
    });
  }

  private disableAllValidators(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
    // Clear form-level validators temporarily
    this.form.clearValidators();
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private enableAllValidators(): void {
    // Re-apply validators to each field
    this.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const control = this.form.get(String(field.key));
        if (control) {
          const validators = this.buildValidators(field);
          control.setValidators(validators);
          control.updateValueAndValidity({ emitEvent: false });
        }
      });
    });
    // Re-apply form-level validators
    this.form.setValidators(this.dateRangeValidator());
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  getFieldError(field: QuotationFormField): string {
    const control = this.form.get(String(field.key));
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Campo obbligatorio.';
    }

    if (control.errors['minlength']) {
      return `Minimo ${field.minLength} caratteri.`;
    }

    if (control.errors['maxlength']) {
      return `Massimo ${field.maxLength} caratteri.`;
    }

    if (control.errors['pattern']) {
      return field.errorMessage ?? 'Formato non valido.';
    }

    if (control.errors['min']) {
      return `Il valore minimo consentito e ${field.min}.`;
    }

    if (control.errors['endDateBeforeStartDate']) {
      return 'La data fine deve essere successiva o uguale alla data inizio.';
    }

    return 'Valore non valido.';
  }

  asCheckbox(field: QuotationFormField): boolean {
    return field.type === 'checkbox';
  }

  asMultiselect(field: QuotationFormField): boolean {
    return field.type === 'multiselect';
  }

  hasNonCheckbox(fields: QuotationFormField[]): boolean {
    return fields.some(f => f.type !== 'checkbox');
  }

  hasCheckbox(fields: QuotationFormField[]): boolean {
    return fields.some(f => f.type === 'checkbox');
  }

  colspanClass(field: QuotationFormField): string {
    if (field.colspan === 3) return 'field--full';
    if (field.colspan === 2) return 'field--wide';
    return '';
  }

  private buildForm(): UntypedFormGroup {
    const controls: Record<string, UntypedFormControl> = {};

    this.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const validators = this.buildValidators(field);
        const initialValue = field.type === 'checkbox' ? false
          : field.type === 'multiselect' ? []
          : '';
        controls[String(field.key)] = new UntypedFormControl(initialValue, validators);
      });
    });

    return new UntypedFormGroup(controls, {
      validators: this.dateRangeValidator(),
    });
  }

  private buildValidators(field: QuotationFormField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) {
      if (field.type === 'multiselect') {
        validators.push((control) =>
          Array.isArray(control.value) && control.value.length > 0
            ? null
            : { required: true },
        );
      } else {
        validators.push(Validators.required);
      }
    }

    if (typeof field.minLength === 'number') {
      validators.push(Validators.minLength(field.minLength));
    }

    if (typeof field.maxLength === 'number') {
      validators.push(Validators.maxLength(field.maxLength));
    }

    if (field.pattern) {
      validators.push(Validators.pattern(field.pattern));
    }

    if (typeof field.min === 'number') {
      validators.push(Validators.min(field.min));
    }

    return validators;
  }

  private dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get('projectStartDate')?.value as string;
      const endDate = control.get('projectEndDate')?.value as string;

      if (!startDate || !endDate) {
        return null;
      }

      if (new Date(endDate) < new Date(startDate)) {
        control.get('projectEndDate')?.setErrors({
          ...(control.get('projectEndDate')?.errors ?? {}),
          endDateBeforeStartDate: true,
        });
        return { endDateBeforeStartDate: true };
      }

      const endDateControl = control.get('projectEndDate');
      if (endDateControl?.hasError('endDateBeforeStartDate')) {
        const currentErrors = { ...(endDateControl.errors ?? {}) };
        delete currentErrors['endDateBeforeStartDate'];
        endDateControl.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
      }

      return null;
    };
  }

  private normalizePayload(formValue: Record<string, unknown>): CreateQuotationPayload {
    const normalized = { ...formValue } as Record<string, unknown>;

    Object.entries(normalized).forEach(([key, value]) => {
      if (this.numberFields.has(key)) {
        normalized[key] = Number(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.join(', ');
      } else if (typeof value === 'string') {
        normalized[key] = value.trim();
      }
    });

    return normalized as unknown as CreateQuotationPayload;
  }

  private restoreCheckboxDefaults(): void {
    this.sections.forEach((section) => {
      section.fields
        .filter((field) => field.type === 'checkbox')
        .forEach((field) => {
          this.form.get(String(field.key))?.setValue(false);
        });
    });
  }
}
