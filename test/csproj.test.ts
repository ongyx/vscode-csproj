import * as assert from "node:assert"
import * as fs from "node:fs/promises"
import { Csproj } from "../src/internal/csproj"
import { TempFs } from "./tempfs"

const MOCK_FILES = {
	"Test1.cs": `Console.WriteLine("Hello World!");`,
	"Test2.ts": `console.log("Hello World!")`,
	"Test3.html":
		"<!DOCTYPE html><html><body><h1>Hello World!</h1></body></html>",
}

const CSP_EMPTY = `<?xml version="1.0" encoding="utf-8"?>
<Project />
`
const CSP_MODIFIED = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Compile Include="src\\Test1.cs" />
  </ItemGroup>
  <ItemGroup>
    <TypescriptCompile Include="src\\Test2.ts" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="src\\Test3.html" />
  </ItemGroup>
</Project>
`
const CSP_MULTIPLE_BEFORE = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Compile Include="src\\Test1.cs" />
    <Compile Include="src\\Test2.cs" />
    <Compile Include="src\\Test3.cs" />
  </ItemGroup>
</Project>
`
const CSP_MULTIPLE_AFTER = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Compile Include="src\\Test1.cs" />
  </ItemGroup>
</Project>
`

const CSP_ITEMGROUP_BEFORE = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Compile Include="src\\Test1.cs" />
  </ItemGroup>
  <ItemGroup>
    <Content Include="index.html" />
  </ItemGroup>
</Project>
`

const CSP_ITEMGROUP_AFTER = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Content Include="index.html" />
  </ItemGroup>
</Project>
`

const CSP_MIXED_SEP = `<?xml version="1.0" encoding="utf-8"?>
<Project>
  <ItemGroup>
    <Compile Include="src/Test1.cs" />
  </ItemGroup>
  <ItemGroup>
    <TypescriptCompile Include="src\\Test2.ts" />
  </ItemGroup>
</Project>
`

const PATH_SEP = "\\"

describe("csproj.Csproj", () => {
	let tfs: TempFs | undefined

	beforeEach(async () => {
		tfs = await TempFs.create()
	})

	afterEach(async () => {
		tfs?.remove()
	})

	describe("addItem()", () => {
		it("should add all items to the project", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_EMPTY,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			csproj.addItem("Compile", tfs.absuri("src/Test1.cs"))
			csproj.addItem("TypescriptCompile", tfs.absuri("src/Test2.ts"))
			csproj.addItem("Content", tfs.absuri("src/Test3.html"))

			assert.strictEqual(csproj.serialize(), CSP_MODIFIED)
		})
	})

	describe("hasItem()", () => {
		it("should report that the project has an item", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_MODIFIED,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			assert.ok(csproj.hasItem(tfs.absuri("src/Test1.cs")))
			assert.ok(csproj.hasItem(tfs.absuri("src/Test2.ts")))
			assert.ok(csproj.hasItem(tfs.absuri("src/Test3.html")))
		})

		it("should report that the project has an item with a non-native directory separator", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_MIXED_SEP,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			assert.ok(csproj.hasItem(tfs.absuri("src/Test1.cs")))
			assert.ok(csproj.hasItem(tfs.absuri("src/Test2.ts")))
		})
	})

	describe("removeItem()", () => {
		it("should remove all items from the project", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_MODIFIED,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			assert.ok(csproj.removeItem(tfs.absuri("src/Test1.cs")))
			assert.ok(csproj.removeItem(tfs.absuri("src/Test2.ts")))
			assert.ok(csproj.removeItem(tfs.absuri("src/Test3.html")))

			assert.strictEqual(csproj.serialize(), CSP_EMPTY)
		})

		it("should remove some items from the project", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_MULTIPLE_BEFORE,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			assert.ok(csproj.removeItem(tfs.absuri("src/Test2.cs")))
			assert.ok(csproj.removeItem(tfs.absuri("src/Test3.cs")))

			assert.strictEqual(csproj.serialize(), CSP_MULTIPLE_AFTER)
		})

		it("should remove one itemgroup from the project", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_ITEMGROUP_BEFORE,
				...MOCK_FILES,
			})

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)

			assert.ok(csproj.removeItem(tfs.absuri("src/Test1.cs")))

			assert.strictEqual(csproj.serialize(), CSP_ITEMGROUP_AFTER)
		})
	})

	describe("save()", () => {
		it("should save the project to disk identically", async () => {
			assert.ok(tfs)
			await tfs.mock({
				"Test.csproj": CSP_EMPTY,
				...MOCK_FILES,
			})

			const identicalPath = tfs.absuri("TestIdentical.csproj")

			const csproj = await Csproj.open(tfs.absuri("Test.csproj"), PATH_SEP)
			await csproj.save(identicalPath)

			const data = await fs.readFile(identicalPath.fsPath, "utf8")
			assert.strictEqual(data, CSP_EMPTY)
		})
	})
})
