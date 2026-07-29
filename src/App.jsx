import { useState, useEffect, useMemo, useRef } from 'react';
import './index.css';

// Function to calculate grade from percentage
const getGrade = (percentage) => {
  if (percentage >= 90) return 'ممتاز';
  if (percentage >= 80) return 'جيد جداً';
  if (percentage >= 65) return 'جيد';
  if (percentage >= 50) return 'مقبول';
  return 'دور ثاني';
};

// Component to render highlighted text
const HighlightedText = ({ text, highlight }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="highlight">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0); // Progress state
  
  const [searchMode, setSearchMode] = useState('name'); // 'name' or 'seatingNo'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  // Load CSV Data with Progress
  useEffect(() => {
    fetch('./data.csv')
      .then(async (response) => {
        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
          return response.text();
        }
        // Exact size of data.csv (uncompressed bytes) to avoid 500% progress due to gzip mismatch
        const exactUncompressedSize = 89845366;
        let total = exactUncompressedSize;
        let loaded = 0;
        const reader = response.body.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          
          let percentage = Math.round((loaded / total) * 100);
          if (percentage > 100) percentage = 100; // Cap at 100% in case size changes
          
          setDownloadProgress(percentage);
        }
        const blob = new Blob(chunks);
        return blob.text();
      })
      .then((csvText) => {
        const rows = csvText.split('\n');
        // Remove header row
        if (rows[0] && rows[0].includes('seating_no')) {
          rows.shift();
        }
        setData(rows);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter data based on search term and mode
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.trim().toLowerCase();
    const results = [];
    
    // Fast loop over strings
    for (let i = 0; i < data.length; i++) {
      const line = data[i];
      if (!line) continue;
      
      // Extremely fast substring check before parsing the line
      if (!line.includes(term)) continue;
      
      // Format: seating_no,"arabic_name",total_degree,"student_case_desc",percentage
      const parts = line.replace(/"/g, '').split(',');
      if (parts.length < 5) continue;
      
      const seating_no = parts[0];
      const arabic_name = parts[1];
      const total_degree = parts[2];
      const student_case_desc = parts[3];
      const percentage = parseFloat(parts[4]);

      const student = { seating_no, arabic_name, total_degree, student_case_desc, 'النسبة المئوية': percentage };

      if (searchMode === 'name') {
        if (arabic_name && arabic_name.toLowerCase().includes(term)) {
          results.push(student);
        }
      } else {
        // seatingNo
        if (seating_no && seating_no.startsWith(term)) {
          results.push(student);
        }
      }
      
      // Limit to 50 results for UI performance
      if (results.length >= 50) break;
    }
    
    return results;
  }, [data, searchTerm, searchMode]);

  // Handle exact match auto-select for seating number
  useEffect(() => {
    if (searchMode === 'seatingNo' && searchResults.length === 1 && searchTerm.trim() === searchResults[0].seating_no.toString()) {
      setSelectedStudent(searchResults[0]);
      setDropdownVisible(false);
    }
  }, [searchResults, searchMode, searchTerm]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (searchMode === 'seatingNo') {
      // Allow only numbers
      if (val !== '' && !/^\d+$/.test(val)) return;
    }
    setSearchTerm(val);
    setDropdownVisible(true);
    // Hide selected student when typing anew, unless it's auto-selected
    if (selectedStudent && val !== selectedStudent.seating_no?.toString() && val !== selectedStudent.arabic_name) {
      setSelectedStudent(null);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedStudent(null);
    setDropdownVisible(false);
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSearchTerm(searchMode === 'name' ? student.arabic_name : student.seating_no.toString());
    setDropdownVisible(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ justifyContent: 'center' }}>
        <div className="loading-container" style={{ textAlign: 'center' }}>
          <h2>جاري تحميل قاعدة البيانات...</h2>
          <p style={{ marginBottom: '1.5rem' }}>يرجى الانتظار للحظات، جاري تحميل الملف بناءً على سرعة الإنترنت لديك.</p>
          
          <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', backgroundColor: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', height: '24px', position: 'relative' }}>
            <div style={{
              width: `${downloadProgress}%`,
              backgroundColor: 'var(--primary-color)',
              height: '100%',
              transition: 'width 0.3s ease'
            }}></div>
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: downloadProgress > 50 ? '#fff' : '#333',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              textShadow: downloadProgress > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
            }}>
              {downloadProgress}%
            </span>
          </div>
          
          {downloadProgress === 100 && (
            <p style={{ marginTop: '1rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>جاري فك تشفير البيانات، لحظات...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>الشهادة الرسمية للثانوية العامة</h1>
        <p>منصة الاستعلام عن نتائج الطلاب (نظام حديث)</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${searchMode === 'name' ? 'active' : ''}`}
          onClick={() => {
            setSearchMode('name');
            clearSearch();
          }}
        >
          البحث بالاسم
        </button>
        <button
          className={`tab ${searchMode === 'seatingNo' ? 'active' : ''}`}
          onClick={() => {
            setSearchMode('seatingNo');
            clearSearch();
          }}
        >
          البحث برقم الجلوس
        </button>
      </div>

      <div className="search-container" ref={dropdownRef}>
        <input
          type="text"
          className="search-input"
          placeholder={searchMode === 'name' ? 'اكتب اسم الطالب...' : 'اكتب رقم الجلوس...'}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setDropdownVisible(true)}
        />
        
        {searchTerm && (
          <button className="clear-btn" onClick={clearSearch} title="مسح">
            &times;
          </button>
        )}

        {dropdownVisible && searchTerm.trim() && !selectedStudent && (
          <div className="dropdown">
            {searchResults.length > 0 ? (
              searchResults.map((student) => (
                <div
                  key={student.seating_no}
                  className="dropdown-item"
                  onClick={() => selectStudent(student)}
                >
                  {searchMode === 'name' ? (
                    <HighlightedText text={student.arabic_name} highlight={searchTerm} />
                  ) : (
                    <span>
                      <HighlightedText text={student.seating_no.toString()} highlight={searchTerm} />
                      {' - '} {student.arabic_name}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="dropdown-item" style={{ textAlign: 'center', color: '#888' }}>
                لا توجد نتيجة مطابقة
              </div>
            )}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="result-card">
          <div className="result-header">
            <h2>{selectedStudent.arabic_name}</h2>
          </div>
          
          <div className="result-grid">
            <div className="data-group">
              <span className="data-label">رقم الجلوس</span>
              <span className="data-value">{selectedStudent.seating_no}</span>
            </div>
            
            <div className="data-group">
              <span className="data-label">الحالة</span>
              <span className={`status-badge ${selectedStudent.student_case_desc.includes('ناجح') ? 'status-success' : 'status-fail'}`}>
                {selectedStudent.student_case_desc}
              </span>
            </div>
            
            <div className="data-group">
              <span className="data-label">المجموع الكلي (من 320)</span>
              <span className="data-value" style={{ color: 'var(--primary-color)' }}>
                {selectedStudent.total_degree}
              </span>
            </div>
            
            <div className="data-group">
              <span className="data-label">النسبة المئوية</span>
              <span className="data-value">{selectedStudent['النسبة المئوية']}%</span>
            </div>
            
            <div className="data-group" style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '1rem' }}>
              <span className="data-label">التقدير العام</span>
              <span className="grade-badge">{getGrade(selectedStudent['النسبة المئوية'])}</span>
            </div>
          </div>
        </div>
      )}

      <div className="footer-signature">
        Made by{' '}
        <a href="https://melwakil.dev" target="_blank" rel="noopener noreferrer">
          Mohamed Elwakil ↗
        </a>
      </div>
    </div>
  );
}

export default App;

