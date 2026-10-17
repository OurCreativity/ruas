# VHS tape script for recording Ruas terminal demo GIF
# Run: vhs docs/demo.tape (requires https://github.com/charmbracelet/vhs)

Output assets/ruas-demo.gif

Set FontSize 16
Set Width 1200
Set Height 720
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 40ms

Type "npx @fk0u/ruas index ."
Enter
Sleep 2.5s

Type "npx @fk0u/ruas ask 'fungsi hitung diskon pelanggan' --roast"
Enter
Sleep 3.5s

Type "npx @fk0u/ruas trace prosesQRIS --depth 2"
Enter
Sleep 3.0s

Type "npx @fk0u/ruas check . --strict"
Enter
Sleep 2.5s

Type "npx @fk0u/ruas vibe recall"
Enter
Sleep 3.0s
