import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../../../util/backend.service';
import { FeeStructure } from '../fee-structure';

@Component({
  selector: 'app-fee-structure-detail',
  standalone: false,
  templateUrl: './fee-structure-detail.html',
  styleUrl: './fee-structure-detail.scss',
})
export class FeeStructureDetail implements OnInit {
  feeStructure: FeeStructure | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage = 'Invalid fee structure.';
      this.isLoading = false;
      return;
    }

    this.backendService.get<FeeStructure>(`fee-structure/${id}`).subscribe({
      next: structure => {
        this.feeStructure = {
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          foodFee: Number(structure.foodFee ?? 0),
          booksFee: Number(structure.booksFee ?? 0),
          generalFee: Number(structure.generalFee ?? 0),
          examFee: Number(structure.examFee ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        };
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee structure.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  getTermLabel(term: string | null | undefined): string {
    return (term ?? '').replace('_', ' ');
  }
}
