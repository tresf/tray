# Made on Linux
# Now also tested on Mac
all:
	node ./generate-baseline-pdfs.js
	node ./compare-all-in-two-folders.js
doc:
	jsdoc -c ./jsdoc.json -u utils/* ./*.js
