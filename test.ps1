$style = Get-Content 'c:\Users\V530S\Documents\Antigravity\CSnavi2\www\css\style.css'
$style = $style -replace 'max-width: 1000px; /\* バナーが', 'max-width: 1050px; /* バナーが'
$style = $style -replace 'width: 320px; /\* バナーの固定', 'width: 400px; /* バナーの固定'
Set-Content 'c:\Users\V530S\Documents\Antigravity\CSnavi2\www\css\style.css' $style -Encoding UTF8
