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
  
  const [searchMode, setSearchMode] = useState('name'); // 'name' or 'seatingNo'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  // Load JSON Data
  useEffect(() => {
    fetch('./data.json')
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
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
    
    for (let i = 0; i < data.length; i++) {
      const student = data[i];
      if (searchMode === 'name') {
        if (student.arabic_name && student.arabic_name.toLowerCase().includes(term)) {
          results.push(student);
        }
      } else {
        // seatingNo
        if (student.seating_no && student.seating_no.toString().startsWith(term)) {
          results.push(student);
        }
      }
      
      // Limit to 50 results for performance
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
        <div className="loading-container">
          <h2>جاري تحميل قاعدة البيانات...</h2>
          <p>يرجى الانتظار، قد يستغرق هذا بضع ثوانٍ</p>
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
    </div>
  );
}

export default App;
