# Clinical Trials Email Generator

A Vercel-hosted tool that converts clinical trials Excel data into formatted emails suitable for pasting into Outlook.

## Features

- Upload Excel files with standardized clinical trials data
- Automatically groups studies by brand name
- Generates formatted HTML email with:
  - NCT numbers as hyperlinks
  - "[updated in Month]" annotations for changed fields
  - "[new study]" tags for newly registered trials
  - Studies organized by drug brand (client product first)
- One-click copy to clipboard (preserves formatting in Outlook)

## Excel Template Structure

### Sheet 1: Clinical Trials Data

| Column | Description | Example |
|--------|-------------|---------|
| Brand | Drug brand name | ILUMYA® |
| Is_New_Study | Boolean flag for new studies | TRUE/FALSE |
| Updated_Fields | Comma-separated list of updated fields | Primary Completion Date, Completion Date |
| NCT_Number | ClinicalTrials.gov identifier | NCT04314544 |
| Study_Title | Full study title | Efficacy and Safety of... |
| Study_URL | Link to ClinicalTrials.gov | https://clinicaltrials.gov/study/NCT04314544 |
| Phase | Study phase | 3 |
| Sponsor | Study sponsor name | Sun Pharmaceutical Industries Limited |
| Status | Study status | Active, not recruiting |
| Start_Date | Study start date | 7/1/2020 |
| Primary_Completion_Date | Primary completion date | 3/26/2025 |
| Completion_Date | Study completion date | 2026-05 |
| Results_First_Posted | Date results were posted | 12/8/2025 |
| Strategic_Implications | Strategic analysis text | This sponsored Phase 3 study... |

### Sheet 2: Config

| Parameter | Value |
|-----------|-------|
| Report_Month | December |
| Report_Year | 2025 |
| Client_Name | Sun Pharma |
| Client_Product | ILUMYA® |
| Report_Date | 01/10/2026 |
| Greeting | Good afternoon Sun Pharma team, |
| Closing | Kind regards, |

### Sheet 3: Drug_Brand_Map (Reference)

| Generic_Name | Brand_Name | Is_Client_Product |
|--------------|------------|-------------------|
| Tildrakizumab | ILUMYA® | TRUE |
| Guselkumab | Tremfya® | FALSE |
| ... | ... | ... |

## Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to project directory:
   ```bash
   cd clinical-trials-email-tool
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Updated_Fields Values

The following field names are recognized for "[updated in Month]" annotations:

- `Primary Completion Date`
- `Completion Date`
- `Results First Posted`
- `Study Status`
- `Start Date`

Multiple fields can be specified as comma-separated values.

## Notes

- The tool does not use AI; all transformations are deterministic
- Brand ordering: Client product appears first, then alphabetical
- Date formats supported: M/D/YYYY or YYYY-MM
- Copy function preserves HTML formatting for Outlook paste
