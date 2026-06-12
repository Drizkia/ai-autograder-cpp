export interface RubricCriteria {
  name: string;
  maxScore: number;
  score: number;
  feedback: string;
}

export interface CodeAnnotation {
  line: number;
  type: 'info' | 'warning' | 'error';
  message: string;
}

export interface StudentResult {
  id: string;
  name: string;
  filename: string;
  code: string;
  score: number;
  status: 'pass' | 'warning' | 'fail';
  rubricBreakdown: RubricCriteria[];
  aiSummary: string;
  annotations: CodeAnnotation[];
}

export interface GradingStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export const GRADING_STEPS: GradingStep[] = [
  { id: 'extract', label: 'Extracting ZIP', description: 'Decompressing and scanning C++ submissions.', status: 'pending' },
  { id: 'rubric', label: 'Analyzing PDF Rubric', description: 'AI Agent extracting grading criteria and constraints.', status: 'pending' },
  { id: 'compile', label: 'Syntax & Compilation', description: 'Validating C++ code against g++ compiler checks.', status: 'pending' },
  { id: 'ai_match', label: 'AI Rubric Matching', description: 'Evaluating correctness, space/time complexity, and style.', status: 'pending' },
  { id: 'plagiarism', label: 'Security & Similarity Scan', description: 'Detecting plagiarism and structural code copying.', status: 'pending' },
  { id: 'finalize', label: 'Compiling Scorecard', description: 'Generating PDF reports and summary analytics.', status: 'pending' },
];

export const CONSOLE_LOGS_TEMPLATE = [
  { step: 'extract', text: '[System] Initializing grading pipeline...' },
  { step: 'extract', text: '[System] Reading zip archive submissions.zip (1.2 MB)...' },
  { step: 'extract', text: '[System] Found files in archive: budi_search.cpp, alice_search.cpp, charlie_memory_leak.cpp, david_unformatted.cpp, eva_syntax_error.cpp' },
  { step: 'extract', text: '[System] Extraction completed successfully. 5 files loaded.' },
  { step: 'rubric', text: '[AI Agent] Loading rubric.pdf (320 KB)...' },
  { step: 'rubric', text: '[AI Agent] Running OCR and Layout Analysis...' },
  { step: 'rubric', text: '[AI Agent] Identified Grading Rubrics:' },
  { step: 'rubric', text: '  - Core Correctness (Functional tests): 50 points' },
  { step: 'rubric', text: '  - Memory Management & Optimization: 30 points' },
  { step: 'rubric', text: '  - Formatting, Comments & Readability: 20 points' },
  { step: 'rubric', text: '[AI Agent] Target constraints: Time limit 1.0s, Space limit 256MB. Language standard: C++17.' },
  { step: 'compile', text: '[Compiler] Invoking g++ -std=c++17 -Wall -Wextra...' },
  { step: 'compile', text: '[Compiler] Compiling budi_search.cpp... SUCCESS' },
  { step: 'compile', text: '[Compiler] Compiling alice_search.cpp... SUCCESS' },
  { step: 'compile', text: '[Compiler] Compiling charlie_memory_leak.cpp... SUCCESS' },
  { step: 'compile', text: '[Compiler] Compiling david_unformatted.cpp... SUCCESS (with style warnings)' },
  { step: 'compile', text: '[Compiler] Compiling eva_syntax_error.cpp... FAILED' },
  { step: 'compile', text: '  - eva_syntax_error.cpp:11:1: error: expected \';\' after struct definition' },
  { step: 'ai_match', text: '[AI Agent] Evaluating budi_search.cpp...' },
  { step: 'ai_match', text: '  - Running 10/10 functional tests: PASSED (10/10)' },
  { step: 'ai_match', text: '  - Inspecting loops and recursion: Time complexity O(log N) detected.' },
  { step: 'ai_match', text: '  - Static Code review: No raw new/delete found. Clean smart usages.' },
  { step: 'ai_match', text: '[AI Agent] Evaluating alice_search.cpp...' },
  { step: 'ai_match', text: '  - Running 10/10 functional tests: PASSED (10/10)' },
  { step: 'ai_match', text: '  - Inspecting loops: Time complexity O(N^2) bubble sort found. Rubric asked for O(N log N).' },
  { step: 'ai_match', text: '[AI Agent] Evaluating charlie_memory_leak.cpp...' },
  { step: 'ai_match', text: '  - Running 10/10 functional tests: PASSED (10/10)' },
  { step: 'ai_match', text: '  - Memory tracer diagnostic: Dynamic memory leak of size 400 bytes at scope exit!' },
  { step: 'ai_match', text: '[AI Agent] Evaluating david_unformatted.cpp...' },
  { step: 'ai_match', text: '  - Running 10/10 functional tests: PASSED (10/10)' },
  { step: 'ai_match', text: '  - Formatting review: Non-descriptive names, poor whitespace spacing.' },
  { step: 'plagiarism', text: '[Security] Running moss similarity matrix checks...' },
  { step: 'plagiarism', text: '  - Similarity budi_search.cpp <-> alice_search.cpp: 12% (Normal)' },
  { step: 'plagiarism', text: '  - Similarity budi_search.cpp <-> charlie_memory_leak.cpp: 8% (Normal)' },
  { step: 'plagiarism', text: '  - Similarity david_unformatted.cpp <-> alice_search.cpp: 15% (Normal)' },
  { step: 'plagiarism', text: '  - Checking for ChatGPT signature codes: No templates matched.' },
  { step: 'finalize', text: '[AI Agent] Compiling final scorecard...' },
  { step: 'finalize', text: '[System] Synthesizing feedback summaries...' },
  { step: 'finalize', text: '[System] Grading pipeline completed. Scorecard generated.' },
];

export const DEFAULT_STUDENTS: StudentResult[] = [
  {
    id: 'student-1',
    name: 'Budi Santoso',
    filename: 'budi_search.cpp',
    score: 95,
    status: 'pass',
    code: `#include <iostream>
#include <vector>

// Binary search implementation
int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;
    
    while (low <= high) {
        int mid = (low + high) / 2; // Potential integer overflow!
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    std::vector<int> nums = {2, 4, 7, 10, 15, 23, 31, 45, 50, 62};
    int target = 23;
    int result = binarySearch(nums, target);
    
    if (result != -1) {
        std::cout << "Element found at index " << result << std::endl;
    } else {
        std::cout << "Element not found in array" << std::endl;
    }
    return 0;
}`,
    rubricBreakdown: [
      { name: 'Core Correctness', maxScore: 50, score: 50, feedback: 'Functional correctness checked. Code passes all standard inputs and boundary tests.' },
      { name: 'Memory & Complexity', maxScore: 30, score: 28, feedback: 'Uses O(log N) binary search. No manual heap allocations. Warning on integer mid-point overflow.' },
      { name: 'Style & Readability', maxScore: 20, score: 17, feedback: 'Well structured and commented. Minor issue: uses std::endl instead of \\n which reduces performance.' }
    ],
    aiSummary: 'Budi implemented a classic binary search in C++. The code compiles cleanly and passes all test cases. The logic is solid and uses standard STL structures. Minor tweaks can be done on integer mid-point computation safety and buffer flushing.',
    annotations: [
      {
        line: 10,
        type: 'warning',
        message: 'Potential integer overflow when high + low is larger than INT_MAX. Replace with `int mid = low + (high - low) / 2;` for safety.'
      },
      {
        line: 29,
        type: 'info',
        message: 'Info: Standard practice recommends using `\\n` instead of `std::endl` to avoid redundant output buffer flushing, especially in loops.'
      }
    ]
  },
  {
    id: 'student-2',
    name: 'Alice Wijaya',
    filename: 'alice_search.cpp',
    score: 82,
    status: 'pass',
    code: `#include <iostream>
#include <vector>

// Bubble Sort + Binary Search
void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    bool swapped;
    for (int i = 0; i < n - 1; i++) {
        swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j+1]) {
                std::swap(arr[j], arr[j+1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}

int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    std::vector<int> nums = {64, 34, 25, 12, 22, 11, 90};
    bubbleSort(nums);
    
    int target = 22;
    int idx = binarySearch(nums, target);
    std::cout << "Sorted index: " << idx << "\\n";
    return 0;
}`,
    rubricBreakdown: [
      { name: 'Core Correctness', maxScore: 50, score: 50, feedback: 'Correct sorting and search algorithm. Passes all functional validation tests.' },
      { name: 'Memory & Complexity', maxScore: 30, score: 18, feedback: 'Uses O(N^2) sorting (Bubble Sort). For sorted array searching, using a quadratic sort beforehand is highly inefficient.' },
      { name: 'Style & Readability', maxScore: 20, score: 14, feedback: 'Code structure is fine, but formatting is slightly compressed. Lacks explanation comments.' }
    ],
    aiSummary: 'Alice combined bubble sort and binary search. The binary search implementation is robust against overflows, but bubble sort is inefficient for large datasets. AI agent recommends using std::sort which uses Introsort O(N log N).',
    annotations: [
      {
        line: 5,
        type: 'warning',
        message: 'Bubble sort has average/worst-case time complexity O(N^2). Use std::sort (O(N log N)) instead to fit the rubric constraints.'
      },
      {
        line: 7,
        type: 'info',
        message: 'Swapped variable declared but not initialized at the top. Safe to initialize inline: `bool swapped = false;`'
      }
    ]
  },
  {
    id: 'student-3',
    name: 'Charlie Lim',
    filename: 'charlie_memory_leak.cpp',
    score: 58,
    status: 'warning',
    code: `#include <iostream>

// Subtask: Array manipulation with dynamic allocation
void manipulateArray(int size) {
    // Dynamically allocate memory
    int* data = new int[size];
    
    for (int i = 0; i < size; i++) {
        data[i] = i * 10;
    }
    
    std::cout << "First element: " << data[0] << "\\n";
    std::cout << "Last element: " << data[size - 1] << "\\n";
    
    // Forgot to call delete[] data! Memory leaked.
}

int main() {
    int n = 100;
    manipulateArray(n);
    std::cout << "Array manipulation completed." << "\\n";
    return 0;
}`,
    rubricBreakdown: [
      { name: 'Core Correctness', maxScore: 50, score: 45, feedback: 'Functionality works. Correct calculation.' },
      { name: 'Memory & Complexity', maxScore: 30, score: 3, feedback: 'Critical memory leak detected. Dynamic array allocated via new[] is never deallocated with delete[].' },
      { name: 'Style & Readability', maxScore: 20, score: 10, feedback: 'Moderate formatting. Lacks modern C++ safety paradigms.' }
    ],
    aiSummary: 'Charlie has a correct functional implementation, but fails the memory diagnostic scan. Memory allocated inside manipulateArray is lost forever at scope exit. The grading agent docked 25 points for critical memory leak.',
    annotations: [
      {
        line: 6,
        type: 'error',
        message: 'Memory dynamic allocation here is leaked. There is no matching delete[] call at function exit!'
      },
      {
        line: 16,
        type: 'info',
        message: 'To make this code safe and exception-resistant, use std::vector<int> instead of manual pointers, which handles cleanup automatically.'
      }
    ]
  },
  {
    id: 'student-4',
    name: 'David Pratama',
    filename: 'david_unformatted.cpp',
    score: 72,
    status: 'pass',
    code: `#include <iostream>
using namespace std;
int fn(int x,int y[],int z){
int a=0;
for(int i=0;i<x;i++){
if(y[i]==z){
a=i;
break;
}
}
return a;
}
int main(){
int arr[5]={1,2,3,4,5};
int ans=fn(5,arr,3);
cout<<ans<<endl;
return 0;
}`,
    rubricBreakdown: [
      { name: 'Core Correctness', maxScore: 50, score: 48, feedback: 'Correct index returned, but returns 0 if element is not found, which is confusing since 0 is a valid index.' },
      { name: 'Memory & Complexity', maxScore: 30, score: 20, feedback: 'Linear search. O(N) complexity is acceptable for small arrays.' },
      { name: 'Style & Readability', maxScore: 20, score: 4, feedback: 'Extremely poor code styling. Non-descriptive names, missing standard indentations, congested statements.' }
    ],
    aiSummary: 'David wrote a linear search. Function compiles but has severe style issues. It uses namespace std which is discouraged in headers/large files. Variable names fn, x, y, z, a are uninformative.',
    annotations: [
      {
        line: 2,
        type: 'info',
        message: '`using namespace std;` imports all names into global scope. Can lead to name collisions. Prefer explicit scopes like `std::cout`.'
      },
      {
        line: 3,
        type: 'warning',
        message: 'Function name `fn` and arguments `x`, `y`, `z` are cryptically named. Rename to `linearSearch`, `size`, `arr`, and `target`.'
      },
      {
        line: 4,
        type: 'warning',
        message: 'Completely unindented blocks. AI agent suggests using standard formatting (indenting loops and inner blocks by 4 spaces).'
      }
    ]
  },
  {
    id: 'student-5',
    name: 'Eva Rosida',
    filename: 'eva_syntax_error.cpp',
    score: 0,
    status: 'fail',
    code: `#include <iostream>
#include <string>

struct Student {
    std::string name;
    int score;
    double gpa
}; // Missing semicolon? Or missing brace?

int main() {
    Student s;
    s.name = "Eva";
    s.score = 90;
    s.gpa = 3.8;
    
    std::cout << "Student name: " << s.name << std::endl;
    return 0;
}`,
    rubricBreakdown: [
      { name: 'Core Correctness', maxScore: 50, score: 0, feedback: 'Compilation failed. Correctness could not be verified.' },
      { name: 'Memory & Complexity', maxScore: 30, score: 0, feedback: 'Unbuildable target.' },
      { name: 'Style & Readability', maxScore: 20, score: 0, feedback: 'Unbuildable target.' }
    ],
    aiSummary: 'Eva submitted code with syntax compile errors. The structure definition in line 7 lacks a semicolon at the end of the `double gpa` member. Code fails compilation and score is defaulted to 0.',
    annotations: [
      {
        line: 7,
        type: 'error',
        message: 'Syntax error: expected \';\' at end of member declaration.'
      }
    ]
  }
];
