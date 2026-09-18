import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// حقول رقمية اختيارية قد تصل كنص أو رقم من نماذج الويب (مثل سنة الصنع أو خط العرض)؛
// التحقق من نطاقها وصحتها يتم داخل AssetsService لأنه يعتمد على قواعد عمل خاصة بكل حقل.
export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  assetCategoryId!: string;

  @IsString()
  @MinLength(1)
  assetTypeId!: string;

  @IsOptional()
  @IsString()
  usageNatureId?: string | null;

  @IsOptional()
  @IsString()
  maintenanceIntervalId?: string | null;

  @IsString()
  @MinLength(1)
  statusId!: string;

  @IsString()
  @MinLength(1)
  owningOrganizationUnitId!: string;

  @IsOptional()
  bookValue?: string | number | null;

  @IsOptional()
  @IsString()
  model?: string | null;

  @IsOptional()
  @IsString()
  origin?: string | null;

  @IsOptional()
  manufactureYear?: string | number | null;

  @IsOptional()
  @IsString()
  serialNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  serialNumberMissing?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  generalAssetName?: string | null;

  @IsOptional()
  @IsString()
  generalBrand?: string | null;

  @IsOptional()
  @IsString()
  generalInventoryNumber?: string | null;

  @IsOptional()
  @IsString()
  generalLocationName?: string | null;

  @IsOptional()
  @IsString()
  generalCustodianName?: string | null;

  @IsOptional()
  @IsString()
  generalConditionNotes?: string | null;

  @IsOptional()
  @IsString()
  vehiclePlateNumber?: string | null;

  @IsOptional()
  @IsString()
  vehicleChassisNumber?: string | null;

  @IsOptional()
  @IsString()
  vehicleEngineNumber?: string | null;

  @IsOptional()
  @IsString()
  vehicleType?: string | null;

  @IsOptional()
  @IsString()
  vehicleColor?: string | null;

  @IsOptional()
  @IsString()
  landPlotNumber?: string | null;

  @IsOptional()
  @IsString()
  landDistrict?: string | null;

  @IsOptional()
  @IsString()
  landMunicipality?: string | null;

  @IsOptional()
  landAreaSquareMeters?: string | number | null;

  @IsOptional()
  @IsString()
  landUse?: string | null;

  @IsOptional()
  @IsString()
  landTitleDeedNumber?: string | null;

  @IsOptional()
  @IsString()
  landCadastralNumber?: string | null;

  @IsOptional()
  @IsString()
  landPropertyGenre?: string | null;

  @IsOptional()
  @IsString()
  landOwnershipType?: string | null;

  @IsOptional()
  @IsString()
  landOccupancyStatus?: string | null;

  @IsOptional()
  @IsString()
  landBoundaries?: string | null;

  @IsOptional()
  landLatitude?: string | number | null;

  @IsOptional()
  landLongitude?: string | number | null;

  @IsOptional()
  @IsString()
  realEstatePropertyNumber?: string | null;

  @IsOptional()
  @IsString()
  realEstateAddress?: string | null;

  @IsOptional()
  realEstateFloorsCount?: string | number | null;

  @IsOptional()
  realEstateBuildingAreaSquareMeters?: string | number | null;

  @IsOptional()
  realEstateConstructionYear?: string | number | null;

  @IsOptional()
  @IsString()
  realEstateTitleDeedNumber?: string | null;

  @IsOptional()
  @IsString()
  realEstateCadastralNumber?: string | null;

  @IsOptional()
  @IsString()
  realEstatePropertyGenre?: string | null;

  @IsOptional()
  @IsString()
  realEstateOwnershipType?: string | null;

  @IsOptional()
  @IsString()
  realEstateOccupancyStatus?: string | null;

  @IsOptional()
  @IsString()
  realEstateBoundaries?: string | null;

  @IsOptional()
  realEstateLatitude?: string | number | null;

  @IsOptional()
  realEstateLongitude?: string | number | null;
}
