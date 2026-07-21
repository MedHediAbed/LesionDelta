// Définit tous les champs DICOM additionnels du patient, regroupés par
// section, avec leur type de saisie. Utilisé par PatientFormScreen pour
// générer le formulaire en accordéon sans dupliquer 110 <TextInput>.

export type FieldType = 'text' | 'integer' | 'numeric' | 'date' | 'time';

export interface FieldDef {
  key: string;      // nom de la colonne en base
  label: string;    // libellé affiché
  type: FieldType;
}

export interface FieldSection {
  title: string;
  fields: FieldDef[];
}

export const PATIENT_FIELD_SECTIONS: FieldSection[] = [
  {
    title: 'Identification',
    fields: [
      { key: 'patient_id', label: "Patient ID (identifiant métier)", type: 'text' },
      { key: 'specific_character_set', label: 'Specific Character Set', type: 'text' },
      { key: 'image_type', label: 'Image Type', type: 'text' },
      { key: 'sop_class_uid', label: 'SOP Class UID', type: 'text' },
      { key: 'sop_instance_uid', label: 'SOP Instance UID', type: 'text' },
      { key: 'accession_number', label: 'Accession Number', type: 'text' },
      { key: 'modality', label: 'Modality', type: 'text' },
    ],
  },
  {
    title: 'Dates & Heures',
    fields: [
      { key: 'instance_creation_date', label: 'Instance Creation Date', type: 'date' },
      { key: 'instance_creation_time', label: 'Instance Creation Time', type: 'time' },
      { key: 'study_date', label: 'Study Date', type: 'date' },
      { key: 'series_date', label: 'Series Date', type: 'date' },
      { key: 'acquisition_date', label: 'Acquisition Date', type: 'date' },
      { key: 'content_date', label: 'Content Date', type: 'date' },
      { key: 'study_time', label: 'Study Time', type: 'time' },
      { key: 'series_time', label: 'Series Time', type: 'time' },
      { key: 'acquisition_time', label: 'Acquisition Time', type: 'time' },
      { key: 'content_time', label: 'Content Time', type: 'time' },
    ],
  },
  {
    title: 'Institution & Médecins',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'institution_name', label: 'Institution Name', type: 'text' },
      { key: 'institution_address', label: 'Institution Address', type: 'text' },
      { key: 'referring_physician_name', label: "Referring Physician's Name", type: 'text' },
      { key: 'station_name', label: 'Station Name', type: 'text' },
      { key: 'study_description', label: 'Study Description', type: 'text' },
      { key: 'series_description', label: 'Series Description', type: 'text' },
      { key: 'institutional_department_name', label: 'Institutional Department Name', type: 'text' },
      { key: 'physicians_of_record', label: 'Physician(s) of Record', type: 'text' },
      { key: 'performing_physician_name', label: "Performing Physician's Name", type: 'text' },
      { key: 'manufacturer_model_name', label: "Manufacturer's Model Name", type: 'text' },
    ],
  },
  {
    title: 'Données cliniques patient',
    fields: [
      { key: 'patient_age', label: "Patient's Age", type: 'integer' },
      { key: 'patient_size', label: "Patient's Size (m)", type: 'numeric' },
      { key: 'patient_weight', label: "Patient's Weight (kg)", type: 'integer' },
      { key: 'allergies', label: 'Allergies', type: 'text' },
      { key: 'pregnancy_status', label: 'Pregnancy Status', type: 'integer' },
      { key: 'body_part_examined', label: 'Body Part Examined', type: 'text' },
      { key: 'patient_position', label: 'Patient Position', type: 'text' },
      { key: 'patient_state', label: 'Patient State', type: 'text' },
      { key: 'special_needs', label: 'Special Needs', type: 'text' },
    ],
  },
  {
    title: 'Contraste',
    fields: [
      { key: 'contrast_bolus_agent', label: 'Contrast/Bolus Agent', type: 'text' },
      { key: 'contrast_bolus_volume', label: 'Contrast/Bolus Volume', type: 'numeric' },
      { key: 'contrast_bolus_total_dose', label: 'Contrast/Bolus Total Dose', type: 'numeric' },
      { key: 'contrast_bolus_ingredient', label: 'Contrast/Bolus Ingredient', type: 'text' },
      { key: 'contrast_bolus_ingredient_concentration', label: 'Contrast/Bolus Ingredient Concentration', type: 'numeric' },
    ],
  },
  {
    title: 'Paramètres de séquence (IRM)',
    fields: [
      { key: 'scanning_sequence', label: 'Scanning Sequence', type: 'text' },
      { key: 'sequence_variant', label: 'Sequence Variant', type: 'text' },
      { key: 'scan_options', label: 'Scan Options', type: 'text' },
      { key: 'mr_acquisition_type', label: 'MR Acquisition Type', type: 'text' },
      { key: 'sequence_name', label: 'Sequence Name', type: 'text' },
      { key: 'angio_flag', label: 'Angio Flag', type: 'text' },
      { key: 'slice_thickness', label: 'Slice Thickness', type: 'numeric' },
      { key: 'repetition_time', label: 'Repetition Time', type: 'numeric' },
      { key: 'echo_time', label: 'Echo Time', type: 'numeric' },
      { key: 'inversion_time', label: 'Inversion Time', type: 'numeric' },
      { key: 'number_of_averages', label: 'Number of Averages', type: 'integer' },
      { key: 'imaging_frequency', label: 'Imaging Frequency', type: 'numeric' },
      { key: 'imaged_nucleus', label: 'Imaged Nucleus', type: 'text' },
      { key: 'echo_numbers', label: 'Echo Number(s)', type: 'integer' },
      { key: 'magnetic_field_strength', label: 'Magnetic Field Strength', type: 'numeric' },
      { key: 'number_of_phase_encoding_steps', label: 'Number of Phase Encoding Steps', type: 'integer' },
      { key: 'echo_train_length', label: 'Echo Train Length', type: 'integer' },
      { key: 'percent_sampling', label: 'Percent Sampling', type: 'integer' },
      { key: 'percent_phase_field_of_view', label: 'Percent Phase Field of View', type: 'numeric' },
      { key: 'pixel_bandwidth', label: 'Pixel Bandwidth', type: 'integer' },
      { key: 'device_serial_number', label: 'Device Serial Number', type: 'text' },
      { key: 'software_versions', label: 'Software Version(s)', type: 'text' },
      { key: 'protocol_name', label: 'Protocol Name', type: 'text' },
      { key: 'transmit_coil_name', label: 'Transmit Coil Name', type: 'text' },
      { key: 'acquisition_matrix', label: 'Acquisition Matrix', type: 'text' },
      { key: 'inplane_phase_encoding_direction', label: 'In-plane Phase Encoding Direction', type: 'text' },
      { key: 'flip_angle', label: 'Flip Angle', type: 'integer' },
      { key: 'variable_flip_angle_flag', label: 'Variable Flip Angle Flag', type: 'text' },
      { key: 'sar', label: 'SAR', type: 'text' },
      { key: 'db_dt', label: 'dB/dt', type: 'numeric' },
    ],
  },
  {
    title: 'Étude / Série / Acquisition',
    fields: [
      { key: 'study_instance_uid', label: 'Study Instance UID', type: 'text' },
      { key: 'series_instance_uid', label: 'Series Instance UID', type: 'text' },
      { key: 'study_id', label: 'Study ID', type: 'text' },
      { key: 'series_number', label: 'Series Number', type: 'integer' },
      { key: 'acquisition_number', label: 'Acquisition Number', type: 'integer' },
      { key: 'instance_number', label: 'Instance Number', type: 'integer' },
      { key: 'image_position_patient', label: 'Image Position (Patient)', type: 'text' },
      { key: 'image_orientation_patient', label: 'Image Orientation (Patient)', type: 'text' },
      { key: 'frame_of_reference_uid', label: 'Frame of Reference UID', type: 'text' },
      { key: 'position_reference_indicator', label: 'Position Reference Indicator', type: 'text' },
      { key: 'slice_location', label: 'Slice Location', type: 'text' },
    ],
  },
  {
    title: 'Image technique',
    fields: [
      { key: 'samples_per_pixel', label: 'Samples per Pixel', type: 'integer' },
      { key: 'photometric_interpretation', label: 'Photometric Interpretation', type: 'text' },
      { key: 'image_rows', label: 'Rows', type: 'integer' },
      { key: 'image_columns', label: 'Columns', type: 'integer' },
      { key: 'pixel_spacing', label: 'Pixel Spacing', type: 'text' },
      { key: 'bits_allocated', label: 'Bits Allocated', type: 'integer' },
      { key: 'bits_stored', label: 'Bits Stored', type: 'integer' },
      { key: 'high_bit', label: 'High Bit', type: 'integer' },
      { key: 'pixel_representation', label: 'Pixel Representation', type: 'integer' },
      { key: 'smallest_image_pixel_value', label: 'Smallest Image Pixel Value', type: 'integer' },
      { key: 'largest_image_pixel_value', label: 'Largest Image Pixel Value', type: 'numeric' },
      { key: 'window_center', label: 'Window Center', type: 'numeric' },
      { key: 'window_width', label: 'Window Width', type: 'numeric' },
      { key: 'window_center_width_explanation', label: 'Window Center & Width Explanation', type: 'text' },
    ],
  },
  {
    title: 'Divers / Procédure',
    fields: [
      { key: 'requesting_physician', label: 'Requesting Physician', type: 'text' },
      { key: 'requested_procedure_description', label: 'Requested Procedure Description', type: 'text' },
      { key: 'pps_start_date', label: 'Performed Procedure Step Start Date', type: 'date' },
      { key: 'pps_start_time', label: 'Performed Procedure Step Start Time', type: 'text' },
      { key: 'pps_id', label: 'Performed Procedure Step ID', type: 'text' },
      { key: 'pps_description', label: 'Performed Procedure Step Description', type: 'text' },
      { key: 'pps_comments', label: 'Comments on the Performed Procedure Step', type: 'text' },
      { key: 'confidentiality_constraint_description', label: 'Confidentiality Constraint on Patient Data Description', type: 'text' },
      { key: 'storage_media_fileset_uid', label: 'Storage Media File-set UID', type: 'text' },
      { key: 'itk_original_direction', label: 'ITK_original_direction', type: 'text' },
      { key: 'itk_original_spacing', label: 'ITK_original_spacing', type: 'text' },
    ],
  },
];
