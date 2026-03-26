-- =============================================================================
-- Add Mock Transporter Data for Testing
-- Fixed version - uses unique trailer registration numbers
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Insert Transporters
-- =============================================================================

INSERT INTO public.ceva_transporters (company_name, contact_person, contact_phone, contact_email, rib_code, status)
VALUES
  ('MACHETE Transport', 'John Machete', '+27 11 234 5678', 'ops@machete.co.za', 'RIB001', 'approved'),
  ('PHU2MA Logistics', 'Phuma Ndlovu', '+27 21 345 6789', 'dispatch@phu2ma.co.za', 'RIB002', 'approved'),
  ('CAG Transport', 'Charles Gomba', '+27 31 456 7890', 'info@cag.co.za', 'RIB003', 'approved'),
  ('LIMGOS Freight', 'Limpho Mokoena', '+27 12 567 8901', 'contact@limgos.co.za', 'RIB004', 'approved'),
  ('Zaza Haulage', 'Zandile Zulu', '+27 41 678 9012', 'bookings@zaza.co.za', 'RIB005', 'approved')
ON CONFLICT (company_name) DO NOTHING;

-- =============================================================================
-- 2. Insert Horses (Trucks) with Tracking Unit IDs
-- =============================================================================

INSERT INTO public.ceva_horses (
  transporter_id,
  registration_number,
  vehicle_type,
  make,
  model,
  year,
  vin_number,
  status,
  tracking_unit_id
)
SELECT
  t.id,
  v.reg,
  v.vtype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.status,
  v.tracking_id
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('JY55ZSGP', 'truck', 'Mercedes-Benz', 'Actros', 2022, 'VIN-JY55ZSGP-001', 'active', 12345),
    ('BH67DFGP', 'truck', 'Volvo', 'FH16', 2021, 'VIN-BH67DFGP-002', 'active', 12346)
) v(reg, vtype, make, model, year, vin, status, tracking_id)
WHERE t.company_name = 'MACHETE Transport'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.vtype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.status,
  v.tracking_id
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('CD78KLMN', 'truck', 'Scania', 'R500', 2023, 'VIN-CD78KLMN-003', 'active', 12347),
    ('EF89PQRS', 'truck', 'MAN', 'TGX', 2020, 'VIN-EF89PQRS-004', 'active', 12348)
) v(reg, vtype, make, model, year, vin, status, tracking_id)
WHERE t.company_name = 'PHU2MA Logistics'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.vtype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.status,
  v.tracking_id
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('GH90TUVW', 'truck', 'Iveco', 'Stralis', 2021, 'VIN-GH90TUVW-005', 'active', 12349),
    ('IJ01XYZA', 'truck', 'DAF', 'XF', 2022, 'VIN-IJ01XYZA-006', 'active', 12350)
) v(reg, vtype, make, model, year, vin, status, tracking_id)
WHERE t.company_name = 'CAG Transport'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.vtype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.status,
  v.tracking_id
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('KL12BCDE', 'truck', 'Mercedes-Benz', 'Arocs', 2023, 'VIN-KL12BCDE-007', 'active', 12351),
    ('MN34FGHI', 'truck', 'Volvo', 'FM', 2020, 'VIN-MN34FGHI-008', 'active', 12352)
) v(reg, vtype, make, model, year, vin, status, tracking_id)
WHERE t.company_name = 'LIMGOS Freight'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.vtype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.status,
  v.tracking_id
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('OP56JKLM', 'truck', 'Scania', 'G410', 2021, 'VIN-OP56JKLM-009', 'active', 12353),
    ('QR78NOPQ', 'truck', 'MAN', 'TGS', 2022, 'VIN-QR78NOPQ-010', 'active', 12354)
) v(reg, vtype, make, model, year, vin, status, tracking_id)
WHERE t.company_name = 'Zaza Haulage'

ON CONFLICT (registration_number) DO NOTHING;

-- =============================================================================
-- 3. Insert Trailers - FIXED with unique registration numbers
-- =============================================================================

INSERT INTO public.ceva_trailers (
  transporter_id,
  registration_number,
  trailer_type,
  make,
  model,
  year,
  vin_number,
  capacity_kg,
  status
)
SELECT
  t.id,
  v.reg,
  v.ttype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.capacity,
  v.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('TRL-MACH001', 'refrigerated', 'Krone', 'Cool Liner', 2022, 'TRL-VIN-001', 28000, 'active'),
    ('TRL-MACH002', 'refrigerated', 'Schmitz', 'SKO 24', 2021, 'TRL-VIN-002', 30000, 'active'),
    ('TRL-MACH003', 'flatbed', 'Hendrickson', 'HPT-1000', 2023, 'TRL-VIN-003', 32000, 'active')
) v(reg, ttype, make, model, year, vin, capacity, status)
WHERE t.company_name = 'MACHETE Transport'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.ttype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.capacity,
  v.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('TRL-PHU001', 'refrigerated', 'Krone', 'Cool Liner', 2023, 'TRL-VIN-004', 28000, 'active'),
    ('TRL-PHU002', 'tautliner', 'Hendrickson', 'HPT-2000', 2022, 'TRL-VIN-005', 30000, 'active'),
    ('TRL-PHU003', 'container', 'Custom', 'C-40FT', 2020, 'TRL-VIN-006', 28000, 'active')
) v(reg, ttype, make, model, year, vin, capacity, status)
WHERE t.company_name = 'PHU2MA Logistics'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.ttype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.capacity,
  v.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('TRL-CAG001', 'refrigerated', 'Schmitz', 'SKO 24', 2021, 'TRL-VIN-007', 30000, 'active'),
    ('TRL-CAG002', 'refrigerated', 'Krone', 'Cool Liner', 2022, 'TRL-VIN-008', 28000, 'active'),
    ('TRL-CAG003', 'flatbed', 'Hendrickson', 'HPT-1000', 2023, 'TRL-VIN-009', 32000, 'active')
) v(reg, ttype, make, model, year, vin, capacity, status)
WHERE t.company_name = 'CAG Transport'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.ttype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.capacity,
  v.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('TRL-LIM001', 'tautliner', 'Hendrickson', 'HPT-2000', 2022, 'TRL-VIN-010', 30000, 'active'),
    ('TRL-LIM002', 'refrigerated', 'Krone', 'Cool Liner', 2023, 'TRL-VIN-011', 28000, 'active'),
    ('TRL-LIM003', 'container', 'Custom', 'C-40FT', 2021, 'TRL-VIN-012', 28000, 'active')
) v(reg, ttype, make, model, year, vin, capacity, status)
WHERE t.company_name = 'LIMGOS Freight'

UNION ALL

SELECT
  t.id,
  v.reg,
  v.ttype,
  v.make,
  v.model,
  v.year,
  v.vin,
  v.capacity,
  v.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('TRL-ZAZA001', 'refrigerated', 'Schmitz', 'SKO 24', 2022, 'TRL-VIN-013', 30000, 'active'),
    ('TRL-ZAZA002', 'refrigerated', 'Krone', 'Cool Liner', 2021, 'TRL-VIN-014', 28000, 'active'),
    ('TRL-ZAZA003', 'flatbed', 'Hendrickson', 'HPT-1000', 2023, 'TRL-VIN-015', 32000, 'active')
) v(reg, ttype, make, model, year, vin, capacity, status)
WHERE t.company_name = 'Zaza Haulage'

ON CONFLICT (registration_number) DO NOTHING;

-- =============================================================================
-- 4. Insert Drivers
-- =============================================================================

INSERT INTO public.ceva_drivers (
  transporter_id,
  first_name,
  last_name,
  contact_phone,
  contact_email,
  license_number,
  license_expiry,
  passport_number,
  passport_expiry,
  status
)
SELECT
  t.id,
  d.fname,
  d.lname,
  d.phone,
  d.email,
  d.license,
  d.license_exp,
  d.passport,
  d.passport_exp,
  d.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('Sipho', 'Dlamini', '+27 82 123 4567', 'sipho@machete.co.za', 'DL-SA-001', '2026-12-31', 'ZA123456', '2027-06-30', 'active'),
    ('Thabo', 'Mokoena', '+27 83 234 5678', 'thabo@machete.co.za', 'DL-SA-002', '2025-11-30', 'ZA234567', '2028-03-15', 'active')
) d(fname, lname, phone, email, license, license_exp, passport, passport_exp, status)
WHERE t.company_name = 'MACHETE Transport'

UNION ALL

SELECT
  t.id,
  d.fname,
  d.lname,
  d.phone,
  d.email,
  d.license,
  d.license_exp,
  d.passport,
  d.passport_exp,
  d.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('Mandla', 'Ngwenya', '+27 84 345 6789', 'mandla@phu2ma.co.za', 'DL-SA-003', '2027-01-15', 'ZA345678', '2026-09-20', 'active'),
    ('Sello', 'Motaung', '+27 85 456 7890', 'sello@phu2ma.co.za', 'DL-SA-004', '2026-08-20', 'ZA456789', '2027-12-10', 'active')
) d(fname, lname, phone, email, license, license_exp, passport, passport_exp, status)
WHERE t.company_name = 'PHU2MA Logistics'

UNION ALL

SELECT
  t.id,
  d.fname,
  d.lname,
  d.phone,
  d.email,
  d.license,
  d.license_exp,
  d.passport,
  d.passport_exp,
  d.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('Bongani', 'Khumalo', '+27 86 567 8901', 'bongani@cag.co.za', 'DL-SA-005', '2025-10-30', 'ZA567890', '2028-05-25', 'active'),
    ('Lucky', 'Ndlovu', '+27 87 678 9012', 'lucky@cag.co.za', 'DL-SA-006', '2027-03-15', 'ZA678901', '2026-11-18', 'active')
) d(fname, lname, phone, email, license, license_exp, passport, passport_exp, status)
WHERE t.company_name = 'CAG Transport'

UNION ALL

SELECT
  t.id,
  d.fname,
  d.lname,
  d.phone,
  d.email,
  d.license,
  d.license_exp,
  d.passport,
  d.passport_exp,
  d.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('Themba', 'Zulu', '+27 88 789 0123', 'themba@limgos.co.za', 'DL-SA-007', '2026-07-20', 'ZA789012', '2027-08-30', 'active'),
    ('Vusi', 'Mthembu', '+27 89 890 1234', 'vusi@limgos.co.za', 'DL-SA-008', '2025-12-10', 'ZA890123', '2028-02-14', 'active')
) d(fname, lname, phone, email, license, license_exp, passport, passport_exp, status)
WHERE t.company_name = 'LIMGOS Freight'

UNION ALL

SELECT
  t.id,
  d.fname,
  d.lname,
  d.phone,
  d.email,
  d.license,
  d.license_exp,
  d.passport,
  d.passport_exp,
  d.status
FROM public.ceva_transporters t
CROSS JOIN LATERAL (
  VALUES
    ('Andile', 'Buthelezi', '+27 90 901 2345', 'andile@zaza.co.za', 'DL-SA-009', '2027-05-15', 'ZA901234', '2026-10-05', 'active'),
    ('Sbu', 'Shabalala', '+27 91 012 3456', 'sbu@zaza.co.za', 'DL-SA-010', '2026-09-25', 'ZA012345', '2028-01-20', 'active')
) d(fname, lname, phone, email, license, license_exp, passport, passport_exp, status)
WHERE t.company_name = 'Zaza Haulage'

ON CONFLICT (passport_number) DO NOTHING;

-- =============================================================================
-- 5. Insert Mock GPS Tracking Positions (for active trucks)
-- =============================================================================

INSERT INTO public.ceva_vehicle_tracking_positions (
  horse_id,
  latitude,
  longitude,
  speed,
  heading,
  address,
  recorded_at
)
SELECT
  h.id,
  v.lat,
  v.lon,
  v.speed,
  v.heading,
  v.address,
  NOW() - INTERVAL '5 minutes'
FROM public.ceva_horses h
CROSS JOIN LATERAL (
  VALUES
    (-25.7479, 28.2293, 85, 180, 'N1 Highway, near Polokwane, Limpopo')
) v(lat, lon, speed, heading, address)
WHERE h.registration_number = 'JY55ZSGP'

UNION ALL

SELECT
  h.id,
  v.lat,
  v.lon,
  v.speed,
  v.heading,
  v.address,
  NOW() - INTERVAL '3 minutes'
FROM public.ceva_horses h
CROSS JOIN LATERAL (
  VALUES
    (-22.5594, 30.3269, 95, 0, 'Approaching Beitbridge Border Post')
) v(lat, lon, speed, heading, address)
WHERE h.registration_number = 'CD78KLMN'

UNION ALL

SELECT
  h.id,
  v.lat,
  v.lon,
  v.speed,
  v.heading,
  v.address,
  NOW() - INTERVAL '10 minutes'
FROM public.ceva_horses h
CROSS JOIN LATERAL (
  VALUES
    (-26.2041, 28.0473, 0, 0, 'Parked at Depot, Johannesburg')
) v(lat, lon, speed, heading, address)
WHERE h.registration_number = 'GH90TUVW';

COMMIT;

-- =============================================================================
-- Verification Queries
-- =============================================================================

SELECT 'Transporters Added:' as info, COUNT(*) as count FROM public.ceva_transporters;
SELECT 'Horses Added:' as info, COUNT(*) as count FROM public.ceva_horses;
SELECT 'Trailers Added:' as info, COUNT(*) as count FROM public.ceva_trailers;
SELECT 'Drivers Added:' as info, COUNT(*) as count FROM public.ceva_drivers;
SELECT 'GPS Positions Added:' as info, COUNT(*) as count FROM public.ceva_vehicle_tracking_positions;
