-- Enable UUIDs and Trigram search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Roles 
CREATE TABLE roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- 'admin', 'course_manager', 'promoter', 'mentor', 'student'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Users (Extends auth.users securely)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper function for RLS
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT r.name 
  FROM users u
  JOIN roles r ON u.role_id = r.id 
  WHERE u.id = auth.uid() AND u.deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Courses
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  fee NUMERIC(10, 2) NOT NULL,
  promoter_commission_rate NUMERIC(5, 2) DEFAULT 0,
  assigned_manager_id UUID REFERENCES users(id),
  assigned_mentor_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_courses_updated_at
BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Course Managers
CREATE TABLE course_managers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Promoters
CREATE TABLE promoters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  manager_id UUID REFERENCES course_managers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Mentors
CREATE TABLE mentors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  manager_id UUID REFERENCES course_managers(id),
  mentor_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. Applications
CREATE TABLE applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  state TEXT,
  course_id UUID REFERENCES courses(id),
  mentor_id UUID REFERENCES mentors(id),
  promoter_id UUID REFERENCES promoters(id),
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Payment Pending', 'Followed Up', 'Closed', 'Joined'
  secret_keywords TEXT, -- Secret keywords added by admin/manager after fee payment
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_applications_updated_at
BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Lead Assignments
CREATE TABLE lead_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. Payments
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES applications(id),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'Pending', -- 'Pending', 'Successful', 'Failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. Commissions
CREATE TABLE commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  beneficiary_id UUID REFERENCES users(id),
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'Pending', -- 'Pending', 'Paid'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_commissions_updated_at
BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. LMS Mappings
CREATE TABLE lms_mappings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) UNIQUE,
  canvas_user_id TEXT NOT NULL,
  canvas_enrollment_id TEXT,
  status TEXT DEFAULT 'Provisioned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_applications_course_id ON applications(course_id);
CREATE INDEX idx_applications_promoter_id ON applications(promoter_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_payments_application_id ON payments(application_id);
CREATE INDEX idx_commissions_beneficiary_id ON commissions(beneficiary_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_courses_manager_id ON courses(assigned_manager_id);
CREATE INDEX idx_courses_mentor_id ON courses(assigned_mentor_id);
CREATE INDEX idx_mentors_code ON mentors(mentor_code);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_mappings ENABLE ROW LEVEL SECURITY;

-- roles policies
CREATE POLICY "Public read roles" ON roles FOR SELECT
  TO public USING (true);

-- users policies
CREATE POLICY "Admin full access users" ON users FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Users can read own profile" ON users FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- courses policies
CREATE POLICY "Admin full access courses" ON courses FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Public read active courses" ON courses FOR SELECT
  TO public USING (is_active = true AND deleted_at IS NULL);

-- course_managers policies
CREATE POLICY "Admin full access course_managers" ON course_managers FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated read course_managers" ON course_managers FOR SELECT
  TO authenticated USING (true);

-- promoters policies
CREATE POLICY "Admin full access promoters" ON promoters FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated read promoters" ON promoters FOR SELECT
  TO authenticated USING (true);

-- mentors policies
CREATE POLICY "Admin full access mentors" ON mentors FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated read mentors" ON mentors FOR SELECT
  TO authenticated USING (true);

-- applications policies
CREATE POLICY "Admin full access apps" ON applications FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

-- PUBLIC INSERT for unauthenticated/authenticated users applying
CREATE POLICY "Public can insert applications" ON applications FOR INSERT
  TO public WITH CHECK (true);

-- Manager scoped apps
CREATE POLICY "Manager read apps" ON applications FOR SELECT
  TO authenticated USING (
    get_user_role() = 'course_manager' AND course_id IN (
      SELECT id FROM courses WHERE assigned_manager_id = auth.uid()
    )
  );

CREATE POLICY "Manager update apps" ON applications FOR UPDATE
  TO authenticated USING (
    get_user_role() = 'course_manager' AND course_id IN (
      SELECT id FROM courses WHERE assigned_manager_id = auth.uid()
    )
  );

-- Promoter scoped apps
CREATE POLICY "Promoter read apps" ON applications FOR SELECT
  TO authenticated USING (
    get_user_role() = 'promoter' AND promoter_id IN (
      SELECT id FROM promoters WHERE user_id = auth.uid()
    )
  );

-- Promoter can update the status of the app they are assigned to
CREATE POLICY "Promoter update app status" ON applications FOR UPDATE
  TO authenticated USING (
    get_user_role() = 'promoter' AND promoter_id IN (
      SELECT id FROM promoters WHERE user_id = auth.uid()
    )
  );

-- commissions policies
CREATE POLICY "Admin full access commissions" ON commissions FOR ALL
  TO authenticated USING (get_user_role() = 'admin');

CREATE POLICY "Managers read commissions" ON commissions FOR SELECT
  TO authenticated USING (
    get_user_role() = 'course_manager' AND beneficiary_id IN (
      SELECT p.user_id FROM promoters p WHERE p.manager_id = (SELECT id FROM course_managers WHERE user_id = auth.uid())
      UNION
      SELECT m.user_id FROM mentors m WHERE m.manager_id = (SELECT id FROM course_managers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Beneficiary read own commissions" ON commissions FOR SELECT
  TO authenticated USING (beneficiary_id = auth.uid());
