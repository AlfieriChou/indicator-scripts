####################################

format:
	npx prettier --write '**/*.mjs'

migrate:
	node yangtze-river-station/index.mjs

push:
	git pull origin master
	git add .
	git commit -m "chore: update indicator data"
	git push origin master

