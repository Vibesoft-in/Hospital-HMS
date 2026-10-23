export const Doctor = [
  { value: "Dr. Mick Thompson", label: "Dr. Mick Thompson" },
  { value: "Dr. Sarah Johnson", label: "Dr. Sarah Johnson" },
  { value: "Dr. Emily Carter", label: "Dr. Emily Carter" },
  { value: "Dr. David Lee", label: "Dr. David Lee" },
  { value: "Dr. Anna Kim", label: "Dr. Anna Kim" },
];
export const Designation = [
  { value: "Cardiologist", label: "Cardiologist" },
  { value: "Orthopedic Surgeon", label: "Orthopedic Surgeon" },
  { value: "Pediatrician", label: "Pediatrician" },
  { value: "Gynecologist", label: "Gynecologist" },
  { value: "Nephrologist", label: "Nephrologist" },
  { value: "Consultant", label: "Consultant" },
  { value: "Senior Consultant", label: "Senior Consultant" },
];
export const Department = [
  { value: "Cardiology", label: "Cardiology" },
  { value: "Cardiothoracic Surgery", label: "Cardiothoracic Surgery" },
  { value: "Neurology", label: "Neurology" },
  { value: "Neurosurgery", label: "Neurosurgery" },
  { value: "Nephrology", label: "Nephrology" },
  { value: "Urology", label: "Urology" },
  { value: "Gastroenterology", label: "Gastroenterology" },
  { value: "Gastrointestinal Surgery", label: "Gastrointestinal Surgery" },
  { value: "Hepatology", label: "Hepatology" },
  { value: "Pulmonology (Respiratory Medicine)", label: "Pulmonology (Respiratory Medicine)" },
  { value: "Endocrinology", label: "Endocrinology" },
  { value: "Rheumatology", label: "Rheumatology" },
  { value: "Orthopedics", label: "Orthopedics" },
  { value: "Oncology (Medical Oncology)", label: "Oncology (Medical Oncology)" },
  { value: "Surgical Oncology", label: "Surgical Oncology" },
  { value: "Radiation Oncology", label: "Radiation Oncology" },
  { value: "Hematology", label: "Hematology" },
  { value: "Dermatology", label: "Dermatology" },
  { value: "Cosmetology / Cosmetic Surgery", label: "Cosmetology / Cosmetic Surgery" },
  { value: "Plastic & Reconstructive Surgery", label: "Plastic & Reconstructive Surgery" },
  { value: "General Surgery", label: "General Surgery" },
  { value: "General Medicine (Internal Medicine)", label: "General Medicine (Internal Medicine)" },
  { value: "Pediatrics", label: "Pediatrics" },
  { value: "Pediatric Surgery", label: "Pediatric Surgery" },
  { value: "Neonatology", label: "Neonatology" },
  { value: "Obstetrics & Gynecology", label: "Obstetrics & Gynecology" },
  { value: "Ophthalmology", label: "Ophthalmology" },
  { value: "ENT (Otorhinolaryngology)", label: "ENT (Otorhinolaryngology)" },
  { value: "Psychiatry", label: "Psychiatry" },
  { value: "Psychology / Clinical Psychology", label: "Psychology / Clinical Psychology" },
  { value: "Dentistry / Dental Surgery", label: "Dentistry / Dental Surgery" },
  { value: "Radiology & Imaging", label: "Radiology & Imaging" },
  { value: "Pathology", label: "Pathology" },
  { value: "Anesthesiology", label: "Anesthesiology" },
  { value: "Anaesthesia and Critical Care", label: "Anaesthesia and Critical Care" },
  { value: "Emergency Medicine", label: "Emergency Medicine" },
  { value: "Critical Care Medicine (Intensivist)", label: "Critical Care Medicine (Intensivist)" },
  { value: "Physiotherapy & Rehabilitation", label: "Physiotherapy & Rehabilitation" },
  { value: "Nutrition & Dietetics", label: "Nutrition & Dietetics" },
  { value: "Infectious Diseases", label: "Infectious Diseases" },
  { value: "Immunology & Allergy", label: "Immunology & Allergy" },
  { value: "Andrology / Fertility (IVF Specialist)", label: "Andrology / Fertility (IVF Specialist)" },
];

const DEPARTMENT_VALUE_ALIASES: Record<string, string> = {
  anaesthesiology: "Anesthesiology",
  anaesthesia: "Anesthesiology",
  anesthesia: "Anesthesiology",
  emergency: "Emergency Medicine",
  surgeon: "General Surgery",
  surgery: "General Surgery",
  medicine: "General Medicine (Internal Medicine)",
  "general medicine": "General Medicine (Internal Medicine)",
  "internal medicine": "General Medicine (Internal Medicine)",
  obg: "Obstetrics & Gynecology",
  gynecology: "Obstetrics & Gynecology",
  gynaecology: "Obstetrics & Gynecology",
  "obstetrics & gynaecology": "Obstetrics & Gynecology",
  obstetrics: "Obstetrics & Gynecology",
  orthopaedics: "Orthopedics",
  paediatrics: "Pediatrics",
  physiotherapy: "Physiotherapy & Rehabilitation",
  radiology: "Radiology & Imaging",
  "radio diagnosis": "Radiology & Imaging",
  pathology: "Pathology",
  "anaesthesia and critical care": "Anaesthesia and Critical Care",
  "anesthesia and critical care": "Anaesthesia and Critical Care",
};

export const findDepartmentOption = (value?: string | null) => {
  if (!value?.trim()) return null;
  const exact = Department.find((d) => d.value === value);
  if (exact) return exact;
  const normalized = value.toLowerCase().trim();
  const caseInsensitive = Department.find((d) => d.value.toLowerCase() === normalized);
  if (caseInsensitive) return caseInsensitive;
  const aliased = DEPARTMENT_VALUE_ALIASES[normalized];
  if (aliased) return Department.find((d) => d.value === aliased) ?? null;
  const uniquePartial = Department.filter((d) => d.value.toLowerCase().includes(normalized));
  if (uniquePartial.length === 1) return uniquePartial[0];
  return null;
};

export const Amount = [
  { value: "$501 - $1000", label: "$501 - $1000" },
  { value: "$501 - $1100", label: "$501 - $1100" },
  { value: "$701 - $1200", label: "$701 - $1200" },
];
export const Status = [
  { value: "Available", label: "Available" },
  { value: "Unavailable", label: "Unavailable" },
];
export const Diagnosis_Type = [
  { value: "Select", label: "Select" },
  { value: "Fever", label: "Fever" },
  { value: "Headache", label: "Headache" },
  { value: "Joint Pain", label: "Joint Pain" },
  { value: "Skin Rash", label: "Skin Rash" },
  { value: "Back Pain", label: "Back Pain" },
];
export const Complaint_History = [
  { value: "Headache", label: "Headache" },
  { value: "Fever", label: "Fever" },
  { value: "Headache", label: "Headache" },
  { value: "Joint Pain", label: "Joint Pain" },
  { value: "Skin Rash", label: "Skin Rash" },
  { value: "Back Pain", label: "Back Pain" },
];
export const Medicine_Name = [
  { value: "Select", label: "Select" },
  { value: "General Medicine", label: "General Medicine" },
  { value: "Axer 90MG Tab", label: "Axer 90MG Tab" },
  { value: "Ramistar XL 2.5", label: "Ramistar XL 2.5" },
];
export const Frequency = [
  { value: "Select", label: "Select" },
  { value: "0-0-1", label: "0-0-1" },
  { value: "1-0-0", label: "1-0-0" },
  { value: "0-1-0", label: "0-1-0" },
];
export const Timing = [
  { value: "Select", label: "Select" },
  { value: "Before Meal", label: "Before Meal" },
  { value: "After Meal", label: "After Meal" },
];
export const empty_Stomach = [
  { value: "Select", label: "Select" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];
export const Service = [
  { value: "Select", label: "Select" },
  { value: "General Consultation", label: "General Consultation" },
  { value: "Dental Cleaning", label: "Dental Cleaning" },
  { value: "Eye Checkup", label: "Eye Checkup" },
  { value: "Blood Test", label: "Blood Test" },
  { value: "Skin Allergy Test", label: "Skin Allergy Test" },
];
export const Payment_Mode = [
  { value: "Select", label: "Select" },
  { value: "Paypal", label: "Paypal" },
  { value: "Stripe", label: "Stripe" },
];
export const Recures_Every = [
  { value: "Select", label: "Select" },
  { value: "1 Week", label: "1 Week" },
  { value: "1 Month", label: "1 Month" },
];
export const Session = [
  { value: "Select", label: "Select" },
  { value: "Morning", label: "Morning" },
  { value: "Afternoon", label: "Afternoon" },
  { value: "Evening", label: "Evening" },
  { value: "Night", label: "Night" },
];
export const Location = [{ value: "Select", label: "Select" }];
export const Country = [
  { value: "Select", label: "Select" },
  { value: "USA", label: "USA" },
  { value: "Canada", label: "Canada" },
  { value: "UK", label: "UK" },
  { value: "Germany", label: "Germany" },
];
export const State = [
  { value: "Select", label: "Select" },
  { value: "California", label: "California" },
  { value: "Ontario", label: "Ontario" },
  { value: "England", label: "England" },
  { value: "Bavaria", label: "Bavaria" },
];
export const City = [
  { value: "Select", label: "Select" },
  { value: "Los Angeles", label: "Los Angeles" },
  { value: "Toronto", label: "Toronto" },
  { value: "London", label: "London" },
  { value: "Munich", label: "Bavaria" },
];
export const StatusActive = [
  { value: "Select", label: "Select" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];
export const contactType = [
  { value: "1", label: "Select" },
  { value: "2", label: "Admin" },
  { value: "3", label: "Stock Out" },
];
export const notesOptions1 = [
  { value: "Bulk Actions", label: "Bulk Actions" },
  { value: "Delete Marked", label: "Delete Marked" },
  { value: "Unmark All", label: "Unmark All" },
  { value: "Mark All", label: "Mark All" },
];
export const notesOptions2 = [
  { value: "Recent", label: "Recent" },
  { value: "Last Modified", label: "Last Modified" },
  { value: "Last Modified by me", label: "Last Modified by me" },
];
export const Assignee = [
  { value: "1", label: "Select" },
  { value: "2", label: "Kathleen" },
  { value: "3", label: "Gifford" },
];
export const Priority = [
  { value: "1", label: "Select" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
  { value: "4", label: "Low" },
];
export const tag = [
  { value: "Select", label: "Select" },
  { value: "Internal", label: "Internal" },
  { value: "Projects", label: "Projects" },
  { value: "Meetings", label: "Meetings" },
  { value: "Reminder", label: "Reminder" },
];

export const priority = [
  { value: "Select", label: "Select" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
  { value: "Low", label: "Low" },
];
export const addAssignee = [
  { value: "Select", label: "Select" },
  { value: "Sophie", label: "Sophie" },
  { value: "Cameron", label: "Cameron" },
  { value: "Doris", label: "Doris" },
  { value: "Rufana", label: "Rufana" },
];
export const StatusCompleted = [
  { value: "Select", label: "Select" },
  { value: "Completed", label: "Completed" },
  { value: "Pending", label: "Pending" },
  { value: "Onhold", label: "Onhold" },
  { value: "Inprogress", label: "Inprogress" },
];
export const Blood_Group = [
  { value: "Select", label: "Select" },
  { value: "A+", label: "A+" },
  { value: "B+", label: "B+" },
  { value: "O+", label: "O+" },
  { value: "A-", label: "A-" },
  { value: "B-", label: "B-" },
  { value: "O-", label: "O-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "HH", label: "HH" },
  { value: "Not Known", label: "Not Known" },
];
export const Gender = [
  { value: "Select", label: "Select" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Others", label: "Others" },
];
export const Marital_Status = [
  { value: "Select", label: "Select" },
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
  { value: "Separated", label: "Separated" },
];
export const Title = [
  { value: "Select", label: "Select" },
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
  { value: "Ms.", label: "Ms." },
  { value: "Baby", label: "Baby" },
  { value: "Master", label: "Master" },
  { value: "Dr.", label: "Dr." },
  { value: "Prof.", label: "Prof." },
];
export const Appointment_Type = [
  { value: "OPD", label: "OPD" },
  { value: "Day Care", label: "Day Care" },

];
export const Primary_Doctor = [
  { value: "Select", label: "Select" },
  { value: "Dr. Mick Thompson", label: "Dr. Mick Thompson" },
  { value: "Dr. Sarah Johnson", label: "Dr. Sarah Johnson" },
  { value: "Dr. Emily Carter", label: "Dr. Emily Carter" },
  { value: "Dr. David Lee", label: "Dr. David Lee" },
  { value: "Dr. Anna Kim", label: "Dr. Anna Kim" },
  { value: "Dr. John Smith", label: "Dr. John Smith" },
  { value: "Dr. Lisa White", label: "Dr. Lisa White" },
  { value: "Dr. Patrica Brown", label: "Dr. Patrica Brown" },
];
export const Bulk_Action = [
  { value: "Select", label: "Select" },
  { value: "Bulk Actions", label: "Bulk Actions" },
  { value: "Delete Marked", label: "Delete Marked" },
  { value: "Unmark All", label: "Unmark All" },
  { value: "Mark All", label: "Mark All" },
];
export const Recent = [
  { value: "Select", label: "Select" },
  { value: "Last Modified", label: "Last Modified" },
  { value: "Last Modified by me", label: "Last Modified by me" },
];
export const defaultSingle = [
  { value: "1", label: "This is a placeholder" },
  { value: "2", label: "Choice 1" },
  { value: "3", label: "Choice 2" },
  { value: "4", label: "Choice 3" },
];
export const Timezone = [
  { value: "(+5:30) GMT", label: "(+5:30) GMT" },
  { value: "(GMT -10:00) Hawaii", label: "(GMT -10:00) Hawaii" },
  { value: "(GMT -9:30) Taiohae", label: "(GMT -9:30) Taiohae" },
  { value: "(GMT -9:00) Alaska ", label: "(GMT -9:00) Alaska " },
  {
    value: "(GMT -8:00) Pacific Time, Canada",
    label: "(GMT -8:00) Pacific Time, Canada",
  },
];
export const Start_Week = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];
export const Date_Format = [
  { value: "18 Mar 2025", label: "18 Mar 2025" },
  { value: "Mar 18 2025", label: "Mar 18 2025" },
  { value: "2025 Mar 18", label: "2025 Mar 18" },
];
export const Time_Format = [
  { value: "12 hrs", label: "12 hrs" },
  { value: "24hrs", label: "24hrs" },
];
export const Default_Language = [
  { value: "English", label: "English" },
  { value: "German", label: "German" },
  { value: "Arabic", label: "Arabic" },
  { value: "French", label: "French" },
];
export const Currency = [
  { value: "USD", label: "USD" },
  { value: "Dollar", label: "Dollar" },
  { value: "Euro", label: "Euro" },
  { value: "Pound", label: "Pound" },
  { value: "Rupee", label: "Rupee" },
];
export const Currency_Symbol = [
  { value: "$", label: "$" },
  { value: "₹", label: "₹" },
  { value: "£", label: "£" },
  { value: "€", label: "€" },
];
export const Currency_Position = [
  { value: "$100", label: "$100" },
  { value: "100$", label: "100$" },
  { value: "$ 100", label: "$ 100" },
  { value: "100 $", label: "100 $" },
];
export const Decimal_Seperator = [
  { value: ".", label: "." },
  { value: ",", label: "," },
];
export const Thousand_Seperator = [
  { value: ".", label: "." },
  { value: ",", label: "," },
];
export const Reminder = [
  { value: "Email", label: "Email" },
  { value: "SMS", label: "SMS" },
];
export const Welcome_Email = [
  { value: "Select", label: "Select" },
  { value: "Welcome Email", label: "Welcome Email" },
  { value: "Appointment Reminder", label: "Appointment Reminder" },
  { value: "Appointment Confirmation", label: "Appointment Confirmation" },
  { value: "Appointment Rescheduled", label: "Appointment Rescheduled" },
  { value: "Appointment Cancelled", label: "Appointment Cancelled" },
  { value: "Test Result Notification", label: "Test Result Notification" },
];
export const days = [
  { value: "01", label: "01" },
  { value: "02", label: "02" },
  { value: "03", label: "03" },
  { value: "05", label: "05" },
  { value: "10", label: "10" },
];
export const SMS_Reminder = [
  { value: "Select", label: "Select" },
  { value: "Appointment Confirmation", label: "Appointment Confirmation" },
  { value: "Appointment Reminder", label: "Appointment Reminder" },
  { value: "Appointment Rescheduled", label: "Appointment Rescheduled" },
  { value: "Appointment Cancellation", label: "Appointment Cancellation" },
  { value: "Test Results Notification", label: "Test Results Notification" },
  { value: "Follow-Up Reminder", label: "Follow-Up Reminder" },
];
export const Email_Reminder = [
  { value: "Select", label: "Select" },
  { value: "Welcome Email", label: "Welcome Email" },
  { value: "Appointment Reminder", label: "Appointment Reminder" },
  { value: "Appointment Rescheduled", label: "Appointment Rescheduled" },
  { value: "Appointment Cancellation", label: "Appointment Cancellation" },
  { value: "Test Results Notification", label: "Test Results Notification" },
];
export const Lunch_Break = [
  { value: "Select", label: "Select" },
  { value: "15 Mins", label: "15 Mins" },
  { value: "30 Mins", label: "30 Mins" },
  { value: "45 Mins", label: "45 Mins" },
  { value: "60 Mins", label: "60 Mins" },
];
export const Lunch_at = [
  { value: "Select", label: "Select" },
  { value: "11 AM", label: "11 AM" },
  { value: "01:00 PM", label: "01:00 PM" },
  { value: "05:00 PM", label: "05:00 PM" },
];
export const Invoice_Roundoff = [
  { value: "Select", label: "Select" },
  { value: "Mar 18 2025", label: "Mar 18 2025" },
  { value: "2025 Mar 18", label: "2025 Mar 18" },
];
export const Module = [
  { value: "Select", label: "Select" },
  { value: "Patient", label: "Patient" },
  { value: "Staff", label: "Staff" },
];
export const Input_Type = [
  { value: "Select", label: "Select" },
  { value: "Text", label: "Text" },
  { value: "Number", label: "Number" },
  { value: "Password", label: "Password" },
  { value: "File", label: "File" },
];
export const Cookies_Position = [
  { value: "Select", label: "Select" },
  { value: "Select", label: "Select" },
];

export const TicketStatus = [
  { value: "Select", label: "Select" },
  { value: "Inprogress", label: "Inprogress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
  { value: "open", label: "open" },
];
export const StaffsRole = [
  { value: "Select", label: "Select" },
  { value: "Admin", label: "Admin" },
  { value: "Reception", label: "Reception" },
  { value: "Nurse", label: "Nurse" },
  { value: "Nurse Practitioner", label: "Nurse Practitioner" },
];
export const StaffsDesignation = [
  { value: "Select", label: "Select" },
  { value: "Admin Officer", label: "Admin Officer" },
  { value: "Front Officer", label: "Front Officer" },
  { value: "Medical Recorder", label: "Medical Recorder" },
  { value: "Billing Executive", label: "Billing Executive" },
];
export const DesignDepartment = [
  { value: "Select", label: "Select" },
  { value: "Nurse", label: "Nurse" },
  { value: "Pharmacist", label: "Pharmacist" },
  { value: "Receptionist", label: "Receptionist" },
  { value: "Technician", label: "Technician" },
  { value: "Medical Assistant", label: "Medical Assistant" },
];
export const Employee = [
  { value: "Select", label: "Select" },
  { value: "James Adair", label: "James Adair" },
  { value: "Adam Milne", label: "Adam Milne" },
  { value: "Richard Clark", label: "Richard Clark" },
  { value: "Robert Reid", label: "Robert Reid" },
];
export const LeaveType = [
  { value: "Select", label: "Select" },
  { value: "Sick Leave", label: "Sick Leave" },
  { value: "Casual Leave", label: "Casual Leave" },
  { value: "Emergency", label: "Emergency" },
  { value: "Vacation", label: "Vacation" },
];
export const Datetype = [
  { value: "Select", label: "Select" },
  { value: "Full Day", label: "Full Day" },
  { value: "Half Day", label: "Half Day" },
];
export const Staff = [
  { value: "Select", label: "Select" },
  { value: "Select staff", label: "Select staff" },
];
export const Received_From = [
  { value: "Select", label: "Select" },
  { value: "Alberto Ripley", label: "Alberto Ripley" },
  { value: "Susan Babin", label: "Susan Babin" },
  { value: "Martin Lisa", label: "Martin Lisa" },
  { value: "Stella Mary", label: "Stella Mary" },
  { value: "Carol Lam", label: "Carol Lam" },
];
export const Category = [
  { value: "Select", label: "Select" },
  { value: "Medical Supplies", label: "Medical Supplies" },
  { value: "Laboratory", label: "Laboratory" },
  { value: "Medical Supplies", label: "Medical Supplies" },
  { value: "Cleaning Services", label: "Cleaning Services" },
];
export const Purchased_By = [
  { value: "Select", label: "Select" },
  { value: "James Allaire", label: "James Allaire" },
  { value: "Esther Schmidt", label: "Esther Schmidt" },
  { value: "Judi Lenahan", label: "Judi Lenahan" },
  { value: "Robert Reid", label: "Robert Reid" },
];
export const Patient = [
  { value: "Select", label: "Select" },
  { value: "Alberto Ripley", label: "Alberto Ripley" },
  { value: "Susan Babin", label: "Susan Babin" },
  { value: "Martin Lisa", label: "Martin Lisa" },
  { value: "Stella Mary", label: "Stella Mary" },
  { value: "Carol Lam", label: "Carol Lam" },
  { value: "Jesus Adams", label: "Jesus Adams" },
  { value: "Ezra Belcher", label: "Ezra Belcher" },
];
export const Practioner = [
  { value: "Select", label: "Select" },
  { value: "Dr. Mick Thompson", label: "Dr. Mick Thompson" },
  { value: "Dr. Sarah Johnson", label: "Dr. Sarah Johnson" },
  { value: "Dr. Emily Carter", label: "Dr. Emily Carter" },
  { value: "Dr. David Lee", label: "Dr. David Lee" },
  { value: "Dr. Anna Kim", label: "Dr. Anna Kim" },
  { value: "Dr. John Smith", label: "Dr. John Smith" },
  { value: "Dr. Lisa White", label: "Dr. Lisa White" },
  { value: "Dr. Patrica Brown", label: "Dr. Patrica Brown" },
];
export const Country_Code = [
  { value: "Select", label: "Select" },
  { value: "US", label: "US" },
  { value: "CA", label: "CA" },
  { value: "UK", label: "UK" },
  { value: "DE", label: "DE" },
  { value: "FR", label: "FR" },
];
export const Country_Name = [
  { value: "Select", label: "Select" },
  { value: "USA", label: "USA" },
  { value: "Canada", label: "Canada" },
  { value: "UK", label: "UK" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
];
export const Status_Checkout = [
  { value: "Select", label: "Select" },
  { value: "rescheduled", label: "rescheduled" },
  { value: "cancelled", label: "cancelled" },
  { value: "in waiting", label: "in waiting" },
  { value: "completed", label: "completed" },
];
export const Location_Type = [
  { value: "Select", label: "Select" },
  { value: "In Person", label: "In Person" },
  { value: "Video Consultation", label: "Video Consultation" },
  { value: "Both", label: "Both" },
];
export const Supplier = [
  { value: "Select", label: "Select" },
  { value: "New one", label: "New one" },
  { value: "Old one", label: "Old one" },
  { value: "Recent one", label: "Recent one" },
];
export const Condition = [
  { value: "Select", label: "Select" },
  { value: "Good one", label: "Good one" },
  { value: "Old one", label: "Old one" },
  { value: "Recent one", label: "Recent one" },
];
export const StatusApproved = [
  { value: "Select", label: "Select" },
  { value: "Approved", label: "Approved" },
  { value: "Pending", label: "Pending" },
];
export const Discount = [
  { value: "0%", label: "0%" },
  { value: "1%", label: "1%" },
  { value: "2%", label: "2%" },
  { value: "3%", label: "3%" },
  { value: "4%", label: "4%" },
];
export const Service_Name = [
  { value: "General Consultation", label: "General Consultation" },
  { value: "Dental Cleaning", label: "Dental Cleaning" },
  { value: "Eye Checkup", label: "Eye Checkup" },
  { value: "X-Ray", label: "X-Ray" },
  { value: "Physiotherapy Session", label: "Physiotherapy Session" },
];
export const Specialization = [
  { value: "General Medicine", label: "General Medicine" },
  { value: "Dentistry", label: "Dentistry" },
  { value: "Ophthalmology", label: "Ophthalmology" },
  { value: "Radiology", label: "Radiology" },
  { value: "Physiotherapy", label: "Physiotherapy" },
];
export const Visit = [
  { value: "Select", label: "Select" },
  { value: "New", label: "New" },
  { value: "emergency", label: "emergency" },
  { value: "followup", label: "followup" },
  { value: "MR", label: "MR" },
];
export const Slot = [
  { value: "Select", label: "Select" },
  { value: "Morning", label: "Morning" },
  { value: "Afternoon", label: "Afternoon" },
  { value: "Evening", label: "Evening" },
  { value: "Night", label: "Night" },
];
export const Visit_Type = [
  { value: "Select", label: "Select" },
  { value: "New", label: "New" },
  { value: "Emergency", label: "Emergency" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Follow-up-report", label: "Follow-up report" },
  { value: "MR", label: "MR" },
];
export const Sessions = [
  { value: "Select", label: "Select" },
  { value: "Morning", label: "Morning" },
  { value: "Afternoon", label: "Afternoon" },
  { value: "Evening", label: "Evening" },
  { value: "Night", label: "Night" },
];

export const Queue_Sort_By = [
  { value: "token", label: "Token Number" },
  { value: "time", label: "Visit Time" },
];


