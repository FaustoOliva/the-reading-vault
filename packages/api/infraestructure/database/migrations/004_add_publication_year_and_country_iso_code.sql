-- Migration: 004_add_publication_year_and_country_iso_code.sql
-- Purpose: Add publication year to Books and ISO codes to Countries
-- Date: March 6, 2026
-- Phase: Feature Enhancement - Publication Year & Country Flags
-- Scope: Add optional publication_year to Books, add iso_code to Countries

USE TheReadingVault;
GO

-- Step 1: Add iso_code column to Countries table
-- This is required for proper flag icon mapping (react-native-flag-icons)
-- ISO 3166-1 alpha-2 standard (e.g., 'AT' for Austria, 'US' for Estados Unidos)

ALTER TABLE Countries
ADD iso_code NVARCHAR(2) NOT NULL DEFAULT 'XX'; -- Temporary default, will be updated

-- Step 2: Update iso_code values for existing countries
-- Populate with ISO codes based on country names
UPDATE Countries SET iso_code = 'AF' WHERE name = 'Afganistán';
UPDATE Countries SET iso_code = 'AL' WHERE name = 'Albania';
UPDATE Countries SET iso_code = 'DZ' WHERE name = 'Argelia';
UPDATE Countries SET iso_code = 'AD' WHERE name = 'Andorra';
UPDATE Countries SET iso_code = 'AO' WHERE name = 'Angola';
UPDATE Countries SET iso_code = 'AG' WHERE name = 'Antigua y Barbuda';
UPDATE Countries SET iso_code = 'AR' WHERE name = 'Argentina';
UPDATE Countries SET iso_code = 'AM' WHERE name = 'Armenia';
UPDATE Countries SET iso_code = 'AU' WHERE name = 'Australia';
UPDATE Countries SET iso_code = 'AT' WHERE name = 'Austria';
UPDATE Countries SET iso_code = 'AZ' WHERE name = 'Azerbaiyán';
UPDATE Countries SET iso_code = 'BS' WHERE name = 'Bahamas';
UPDATE Countries SET iso_code = 'BH' WHERE name = 'Barein';
UPDATE Countries SET iso_code = 'BD' WHERE name = 'Bangladés';
UPDATE Countries SET iso_code = 'BB' WHERE name = 'Barbados';
UPDATE Countries SET iso_code = 'BY' WHERE name = 'Bielorrusia';
UPDATE Countries SET iso_code = 'BE' WHERE name = 'Bélgica';
UPDATE Countries SET iso_code = 'BZ' WHERE name = 'Belice';
UPDATE Countries SET iso_code = 'BJ' WHERE name = 'Benín';
UPDATE Countries SET iso_code = 'BT' WHERE name = 'Bután';
UPDATE Countries SET iso_code = 'BO' WHERE name = 'Bolivia';
UPDATE Countries SET iso_code = 'BA' WHERE name = 'Bosnia y Herzegovina';
UPDATE Countries SET iso_code = 'BW' WHERE name = 'Botswana';
UPDATE Countries SET iso_code = 'BR' WHERE name = 'Brasil';
UPDATE Countries SET iso_code = 'BN' WHERE name = 'Brunéi';
UPDATE Countries SET iso_code = 'BG' WHERE name = 'Bulgaria';
UPDATE Countries SET iso_code = 'BF' WHERE name = 'Burkina Faso';
UPDATE Countries SET iso_code = 'BI' WHERE name = 'Burundi';
UPDATE Countries SET iso_code = 'KH' WHERE name = 'Camboya';
UPDATE Countries SET iso_code = 'CM' WHERE name = 'Camerún';
UPDATE Countries SET iso_code = 'CA' WHERE name = 'Canadá';
UPDATE Countries SET iso_code = 'CV' WHERE name = 'Cabo Verde';
UPDATE Countries SET iso_code = 'CF' WHERE name = 'República Centroafricana';
UPDATE Countries SET iso_code = 'TD' WHERE name = 'Chad';
UPDATE Countries SET iso_code = 'CL' WHERE name = 'Chile';
UPDATE Countries SET iso_code = 'CN' WHERE name = 'China';
UPDATE Countries SET iso_code = 'CO' WHERE name = 'Colombia';
UPDATE Countries SET iso_code = 'KM' WHERE name = 'Comoras';
UPDATE Countries SET iso_code = 'CG' WHERE name = 'Congo';
UPDATE Countries SET iso_code = 'CR' WHERE name = 'Costa Rica';
UPDATE Countries SET iso_code = 'HR' WHERE name = 'Croacia';
UPDATE Countries SET iso_code = 'CU' WHERE name = 'Cuba';
UPDATE Countries SET iso_code = 'CY' WHERE name = 'Chipre';
UPDATE Countries SET iso_code = 'CZ' WHERE name = 'República Checa';
UPDATE Countries SET iso_code = 'DK' WHERE name = 'Dinamarca';
UPDATE Countries SET iso_code = 'DJ' WHERE name = 'Djibouti';
UPDATE Countries SET iso_code = 'DM' WHERE name = 'Dominica';
UPDATE Countries SET iso_code = 'DO' WHERE name = 'República Dominicana';
UPDATE Countries SET iso_code = 'EC' WHERE name = 'Ecuador';
UPDATE Countries SET iso_code = 'EG' WHERE name = 'Egipto';
UPDATE Countries SET iso_code = 'SV' WHERE name = 'El Salvador';
UPDATE Countries SET iso_code = 'GQ' WHERE name = 'Guinea Ecuatorial';
UPDATE Countries SET iso_code = 'ER' WHERE name = 'Eritrea';
UPDATE Countries SET iso_code = 'EE' WHERE name = 'Estonia';
UPDATE Countries SET iso_code = 'SZ' WHERE name = 'Eswatini';
UPDATE Countries SET iso_code = 'ET' WHERE name = 'Etiopía';
UPDATE Countries SET iso_code = 'FJ' WHERE name = 'Fiyi';
UPDATE Countries SET iso_code = 'FI' WHERE name = 'Finlandia';
UPDATE Countries SET iso_code = 'FR' WHERE name = 'Francia';
UPDATE Countries SET iso_code = 'GA' WHERE name = 'Gabón';
UPDATE Countries SET iso_code = 'GM' WHERE name = 'Gambia';
UPDATE Countries SET iso_code = 'GE' WHERE name = 'Georgia';
UPDATE Countries SET iso_code = 'DE' WHERE name = 'Alemania';
UPDATE Countries SET iso_code = 'GH' WHERE name = 'Ghana';
UPDATE Countries SET iso_code = 'GR' WHERE name = 'Grecia';
UPDATE Countries SET iso_code = 'GD' WHERE name = 'Granada';
UPDATE Countries SET iso_code = 'GT' WHERE name = 'Guatemala';
UPDATE Countries SET iso_code = 'GN' WHERE name = 'Guinea';
UPDATE Countries SET iso_code = 'GW' WHERE name = 'Guinea-Bisau';
UPDATE Countries SET iso_code = 'GY' WHERE name = 'Guyana';
UPDATE Countries SET iso_code = 'HT' WHERE name = 'Haití';
UPDATE Countries SET iso_code = 'HN' WHERE name = 'Honduras';
UPDATE Countries SET iso_code = 'HU' WHERE name = 'Hungría';
UPDATE Countries SET iso_code = 'IS' WHERE name = 'Islandia';
UPDATE Countries SET iso_code = 'IN' WHERE name = 'India';
UPDATE Countries SET iso_code = 'ID' WHERE name = 'Indonesia';
UPDATE Countries SET iso_code = 'IR' WHERE name = 'Irán';
UPDATE Countries SET iso_code = 'IQ' WHERE name = 'Iraq';
UPDATE Countries SET iso_code = 'IE' WHERE name = 'Irlanda';
UPDATE Countries SET iso_code = 'IL' WHERE name = 'Israel';
UPDATE Countries SET iso_code = 'IT' WHERE name = 'Italia';
UPDATE Countries SET iso_code = 'CI' WHERE name = 'Costa de Marfil';
UPDATE Countries SET iso_code = 'JM' WHERE name = 'Jamaica';
UPDATE Countries SET iso_code = 'JP' WHERE name = 'Japón';
UPDATE Countries SET iso_code = 'JO' WHERE name = 'Jordania';
UPDATE Countries SET iso_code = 'KZ' WHERE name = 'Kazajistán';
UPDATE Countries SET iso_code = 'KE' WHERE name = 'Kenia';
UPDATE Countries SET iso_code = 'KI' WHERE name = 'Kiribati';
UPDATE Countries SET iso_code = 'KW' WHERE name = 'Kuwait';
UPDATE Countries SET iso_code = 'KG' WHERE name = 'Kirguistán';
UPDATE Countries SET iso_code = 'LA' WHERE name = 'Laos';
UPDATE Countries SET iso_code = 'LV' WHERE name = 'Letonia';
UPDATE Countries SET iso_code = 'LB' WHERE name = 'Líbano';
UPDATE Countries SET iso_code = 'LS' WHERE name = 'Lesotho';
UPDATE Countries SET iso_code = 'LR' WHERE name = 'Liberia';
UPDATE Countries SET iso_code = 'LY' WHERE name = 'Libya';
UPDATE Countries SET iso_code = 'LI' WHERE name = 'Liechtenstein';
UPDATE Countries SET iso_code = 'LT' WHERE name = 'Lituania';
UPDATE Countries SET iso_code = 'LU' WHERE name = 'Luxemburgo';
UPDATE Countries SET iso_code = 'MG' WHERE name = 'Madagascar';
UPDATE Countries SET iso_code = 'MW' WHERE name = 'Malawi';
UPDATE Countries SET iso_code = 'MY' WHERE name = 'Malaysia';
UPDATE Countries SET iso_code = 'MV' WHERE name = 'Maldivas';
UPDATE Countries SET iso_code = 'ML' WHERE name = 'Mali';
UPDATE Countries SET iso_code = 'MT' WHERE name = 'Malta';
UPDATE Countries SET iso_code = 'MH' WHERE name = 'Islas Marshall';
UPDATE Countries SET iso_code = 'MR' WHERE name = 'Mauritania';
UPDATE Countries SET iso_code = 'MU' WHERE name = 'Mauricio';
UPDATE Countries SET iso_code = 'MX' WHERE name = 'México';
UPDATE Countries SET iso_code = 'FM' WHERE name = 'Micronesia';
UPDATE Countries SET iso_code = 'MD' WHERE name = 'Moldavia';
UPDATE Countries SET iso_code = 'MC' WHERE name = 'Mónaco';
UPDATE Countries SET iso_code = 'MN' WHERE name = 'Mongolia';
UPDATE Countries SET iso_code = 'ME' WHERE name = 'Montenegro';
UPDATE Countries SET iso_code = 'MA' WHERE name = 'Marruecos';
UPDATE Countries SET iso_code = 'MZ' WHERE name = 'Mozambique';
UPDATE Countries SET iso_code = 'MM' WHERE name = 'Myanmar';
UPDATE Countries SET iso_code = 'NA' WHERE name = 'Namibia';
UPDATE Countries SET iso_code = 'NR' WHERE name = 'Nauru';
UPDATE Countries SET iso_code = 'NP' WHERE name = 'Nepal';
UPDATE Countries SET iso_code = 'NL' WHERE name = 'Países Bajos';
UPDATE Countries SET iso_code = 'NZ' WHERE name = 'Nueva Zelanda';
UPDATE Countries SET iso_code = 'NI' WHERE name = 'Nicaragua';
UPDATE Countries SET iso_code = 'NE' WHERE name = 'Niger';
UPDATE Countries SET iso_code = 'NG' WHERE name = 'Nigeria';
UPDATE Countries SET iso_code = 'KP' WHERE name = 'Corea del Norte';
UPDATE Countries SET iso_code = 'NO' WHERE name = 'Noruega';
UPDATE Countries SET iso_code = 'OM' WHERE name = 'Omán';
UPDATE Countries SET iso_code = 'PK' WHERE name = 'Pakistán';
UPDATE Countries SET iso_code = 'PW' WHERE name = 'Palaos';
UPDATE Countries SET iso_code = 'PA' WHERE name = 'Panamá';
UPDATE Countries SET iso_code = 'PG' WHERE name = 'Papua Nueva Guinea';
UPDATE Countries SET iso_code = 'PY' WHERE name = 'Paraguay';
UPDATE Countries SET iso_code = 'PE' WHERE name = 'Perú';
UPDATE Countries SET iso_code = 'PH' WHERE name = 'Filipinas';
UPDATE Countries SET iso_code = 'PL' WHERE name = 'Polonia';
UPDATE Countries SET iso_code = 'PT' WHERE name = 'Portugal';
UPDATE Countries SET iso_code = 'QA' WHERE name = 'Catar';
UPDATE Countries SET iso_code = 'RO' WHERE name = 'Romania';
UPDATE Countries SET iso_code = 'RU' WHERE name = 'Rusia';
UPDATE Countries SET iso_code = 'RW' WHERE name = 'Ruanda';
UPDATE Countries SET iso_code = 'KN' WHERE name = 'San Cristóbal y Nieves';
UPDATE Countries SET iso_code = 'LC' WHERE name = 'Santa Lucía';
UPDATE Countries SET iso_code = 'VC' WHERE name = 'San Vicente y las Granadinas';
UPDATE Countries SET iso_code = 'WS' WHERE name = 'Samoa';
UPDATE Countries SET iso_code = 'SM' WHERE name = 'San Marino';
UPDATE Countries SET iso_code = 'ST' WHERE name = 'Santo Tomé y Príncipe';
UPDATE Countries SET iso_code = 'SA' WHERE name = 'Arabia Saudita';
UPDATE Countries SET iso_code = 'SN' WHERE name = 'Senegal';
UPDATE Countries SET iso_code = 'RS' WHERE name = 'Serbia';
UPDATE Countries SET iso_code = 'SC' WHERE name = 'Seychelles';
UPDATE Countries SET iso_code = 'SL' WHERE name = 'Sierra Leona';
UPDATE Countries SET iso_code = 'SG' WHERE name = 'Singapur';
UPDATE Countries SET iso_code = 'SK' WHERE name = 'Eslovaquia';
UPDATE Countries SET iso_code = 'SI' WHERE name = 'Eslovenia';
UPDATE Countries SET iso_code = 'SB' WHERE name = 'Islas Salomón';
UPDATE Countries SET iso_code = 'SO' WHERE name = 'Somalia';
UPDATE Countries SET iso_code = 'ZA' WHERE name = 'Sudáfrica';
UPDATE Countries SET iso_code = 'KR' WHERE name = 'Corea del Sur';
UPDATE Countries SET iso_code = 'ES' WHERE name = 'España';
UPDATE Countries SET iso_code = 'LK' WHERE name = 'Sri Lanka';
UPDATE Countries SET iso_code = 'SD' WHERE name = 'Sudán';
UPDATE Countries SET iso_code = 'SR' WHERE name = 'Surinam';
UPDATE Countries SET iso_code = 'SE' WHERE name = 'Suecia';
UPDATE Countries SET iso_code = 'CH' WHERE name = 'Suiza';
UPDATE Countries SET iso_code = 'SY' WHERE name = 'Siria';
UPDATE Countries SET iso_code = 'TW' WHERE name = 'Taiwán';
UPDATE Countries SET iso_code = 'TJ' WHERE name = 'Tayikistan';
UPDATE Countries SET iso_code = 'TZ' WHERE name = 'Tanzania';
UPDATE Countries SET iso_code = 'TH' WHERE name = 'Tailandia';
UPDATE Countries SET iso_code = 'TL' WHERE name = 'Timor Oriental';
UPDATE Countries SET iso_code = 'TG' WHERE name = 'Togo';
UPDATE Countries SET iso_code = 'TO' WHERE name = 'Tonga';
UPDATE Countries SET iso_code = 'TT' WHERE name = 'Trinidad y Tobago';
UPDATE Countries SET iso_code = 'TN' WHERE name = 'Túnez';
UPDATE Countries SET iso_code = 'TR' WHERE name = 'Turquía';
UPDATE Countries SET iso_code = 'TM' WHERE name = 'Turkmenistán';
UPDATE Countries SET iso_code = 'TV' WHERE name = 'Tuvalu';
UPDATE Countries SET iso_code = 'UG' WHERE name = 'Uganda';
UPDATE Countries SET iso_code = 'UA' WHERE name = 'Ucrania';
UPDATE Countries SET iso_code = 'AE' WHERE name = 'Emiratos Árabes Unidos';
UPDATE Countries SET iso_code = 'GB' WHERE name = 'Reino Unido';
UPDATE Countries SET iso_code = 'US' WHERE name = 'Estados Unidos';
UPDATE Countries SET iso_code = 'UY' WHERE name = 'Uruguay';
UPDATE Countries SET iso_code = 'UZ' WHERE name = 'Uzbekistán';
UPDATE Countries SET iso_code = 'VU' WHERE name = 'Vanuatu';
UPDATE Countries SET iso_code = 'VA' WHERE name = 'Ciudad del Vaticano';
UPDATE Countries SET iso_code = 'VE' WHERE name = 'Venezuela';
UPDATE Countries SET iso_code = 'VN' WHERE name = 'Vietnam';
UPDATE Countries SET iso_code = 'YE' WHERE name = 'Yemen';
UPDATE Countries SET iso_code = 'ZM' WHERE name = 'Zambia';
UPDATE Countries SET iso_code = 'ZW' WHERE name = 'Zimbabwe';

-- Update any remaining countries with default code (for countries not in the mapping above)
UPDATE Countries SET iso_code = 'XX' WHERE iso_code = 'XX';

-- Step 4: Add UNIQUE constraint to iso_code column after data is populated
ALTER TABLE Countries
ADD CONSTRAINT UQ_Countries_ISOCode UNIQUE (iso_code);

-- Step 5: Add publication_year column to Books table
-- NULL default to preserve existing book records without requiring data fill
-- CHECK constraint ensures valid year range (1000-9999)
ALTER TABLE Books
ADD publication_year INT NULL;

-- Step 6: Add CHECK constraint to publication_year column
ALTER TABLE Books
ADD CONSTRAINT CHK_PublicationYear 
    CHECK (publication_year IS NULL OR (publication_year >= 1000 AND publication_year <= 9999));

-- Step 7: Create index on publication_year for filter queries
CREATE NONCLUSTERED INDEX IX_Books_PublicationYear 
ON Books(publication_year) 
WHERE publication_year IS NOT NULL;

GO

PRINT N'✅ Migration 004 completed successfully!';
PRINT N'   - Added iso_code column to Countries table';
PRINT N'   - Added publication_year column to Books table';
PRINT N'   - Created UNIQUE constraint on Countries.iso_code';
PRINT N'   - Created CHECK constraint on Books.publication_year';
PRINT N'   - Created index for publication_year filtering';

