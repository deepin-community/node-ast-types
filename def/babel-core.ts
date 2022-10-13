import { Fork } from "../types";
import esProposalsDef from "./es-proposals";
import typesPlugin from "../lib/types";
import sharedPlugin from "../lib/shared";
import { namedTypes as N } from "../gen/namedTypes";

export default function (fork: Fork) {
  fork.use(esProposalsDef);

  var types = fork.use(typesPlugin);
  var defaults = fork.use(sharedPlugin).defaults;
  var def = types.Type.def;
  var or = types.Type.or;

  def("Noop")
    .bases("Statement")
    .build();

  def("DoExpression")
    .bases("Expression")
    .build("body")
    .field("body", [def("Statement")]);

  def("BindExpression")
    .bases("Expression")
    .build("object", "callee")
    .field("object", or(def("Expression"), null))
    .field("callee", def("Expression"));

  def("ParenthesizedExpression")
    .bases("Expression")
    .build("expression")
    .field("expression", def("Expression"));

  def("ExportNamespaceSpecifier")
    .bases("Specifier")
    .build("exported")
    .field("exported", def("Identifier"));

  def("ExportDefaultSpecifier")
    .bases("Specifier")
    .build("exported")
    .field("exported", def("Identifier"));

  def("CommentBlock")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

  def("CommentLine")
    .bases("Comment")
    .build("value", /*optional:*/ "leading", "trailing");

  def("Directive")
    .bases("Node")
    .build("value")
    .field("value", def("DirectiveLiteral"));

  def("DirectiveLiteral")
    .bases("Node", "Expression")
    .build("value")
    .field("value", String, defaults["use strict"]);

  def("InterpreterDirective")
    .bases("Node")
    .build("value")
    .field("value", String);

  def("BlockStatement")
    .bases("Statement")
    .build("body")
    .field("body", [def("Statement")])
    .field("directives", [def("Directive")], defaults.emptyArray);

  def("Program")
    .bases("Node")
    .build("body")
    .field("body", [def("Statement")])
    .field("directives", [def("Directive")], defaults.emptyArray)
    .field("interpreter", or(def("InterpreterDirective"), null), defaults["null"]);

  // Split Literal
  def("StringLiteral")
    .bases("Literal")
    .build("value")
    .field("value", String);

  def("NumericLiteral")
    .bases("Literal")
    .build("value")
    .field("value", Number)
    .field("raw", or(String, null), defaults["null"])
    .field("extra", {
      rawValue: Number,
      raw: String
    }, function getDefault(this: N.NumericLiteral) {
      return {
        rawValue: this.value,
        raw: this.value + ""
      }
    });

  def("BigIntLiteral")
    .bases("Literal")
    .build("value")
    // Only String really seems appropriate here, since BigInt values
    // often exceed the limits of JS numbers.
    .field("value", or(String, Number))
    .field("extra", {
      rawValue: String,
      raw: String
    }, function getDefault(this: N.BigIntLiteral) {
      return {
        rawValue: String(this.value),
        raw: this.value + "n"
      };
    });

  def("NullLiteral")
    .bases("Literal")
    .build()
    .field("value", null, defaults["null"]);

  def("BooleanLiteral")
    .bases("Literal")
    .build("value")
    .field("value", Boolean);

  def("RegExpLiteral")
    .bases("Literal")
    .build("pattern", "flags")
    .field("pattern", String)
    .field("flags", String)
    .field("value", RegExp, function (this: N.RegExpLiteral) {
      return new RegExp(this.pattern, this.flags);
    });

  var ObjectExpressionProperty = or(
    def("Property"),
    def("ObjectMethod"),
    def("ObjectProperty"),
    def("SpreadProperty"),
    def("SpreadElement")
  );

  // Split Property -> ObjectProperty and ObjectMethod
  def("ObjectExpression")
    .bases("Expression")
    .build("properties")
    .field("properties", [ObjectExpressionProperty]);

  // ObjectMethod hoist .value properties to own properties
  def("ObjectMethod")
    .bases("Node", "Function")
    .build("kind", "key", "params", "body", "computed")
    .field("kind", or("method", "get", "set"))
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("params", [def("Pattern")])
    .field("body", def("BlockStatement"))
    .field("computed", Boolean, defaults["false"])
    .field("generator", Boolean, defaults["false"])
    .field("async", Boolean, defaults["false"])
    .field("accessibility", // TypeScript
           or(def("Literal"), null),
           defaults["null"])
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  def("ObjectProperty")
    .bases("Node")
    .build("key", "value")
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")))
    .field("value", or(def("Expression"), def("Pattern")))
    .field("accessibility", // TypeScript
           or(def("Literal"), null),
           defaults["null"])
    .field("computed", Boolean, defaults["false"]);

  var ClassBodyElement = or(
    def("MethodDefinition"),
    def("VariableDeclarator"),
    def("ClassPropertyDefinition"),
    def("ClassProperty"),
    def("ClassPrivateProperty"),
    def("ClassMethod"),
    def("ClassPrivateMethod"),
  );

  // MethodDefinition -> ClassMethod
  def("ClassBody")
    .bases("Declaration")
    .build("body")
    .field("body", [ClassBodyElement]);

  def("ClassMethod")
    .bases("Declaration", "Function")
    .build("kind", "key", "params", "body", "computed", "static")
    .field("key", or(def("Literal"), def("Identifier"), def("Expression")));

  def("ClassPrivateMethod")
    .bases("Declaration", "Function")
    .build("key", "params", "body", "kind", "computed", "static")
    .field("key", def("PrivateName"));

  ["ClassMethod",
   "ClassPrivateMethod",
  ].forEach(typeName => {
    def(typeName)
      .field("kind", or("get", "set", "method", "constructor"), () => "method")
      .field("body", def("BlockStatement"))
      .field("computed", Boolean, defaults["false"])
      .field("static", or(Boolean, null), defaults["null"])
      .field("abstract", or(Boolean, null), defaults["null"])
      .field("access", or("public", "private", "protected", null), defaults["null"])
      .field("accessibility", or("public", "private", "protected", null), defaults["null"])
      .field("decorators", or([def("Decorator")], null), defaults["null"])
      .field("optional", or(Boolean, null), defaults["null"]);
  });

  var ObjectPatternProperty = or(
    def("Property"),
    def("PropertyPattern"),
    def("SpreadPropertyPattern"),
    def("SpreadProperty"), // Used by Esprima
    def("ObjectProperty"), // Babel 6
    def("RestProperty") // Babel 6
  );

  // Split into RestProperty and SpreadProperty
  def("ObjectPattern")
    .bases("Pattern")
    .build("properties")
    .field("properties", [ObjectPatternProperty])
    .field("decorators",
           or([def("Decorator")], null),
           defaults["null"]);

  def("SpreadProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

  def("RestProperty")
    .bases("Node")
    .build("argument")
    .field("argument", def("Expression"));

  def("ForAwaitStatement")
    .bases("Statement")
    .build("left", "right", "body")
    .field("left", or(
      def("VariableDeclaration"),
      def("Expression")))
    .field("right", def("Expression"))
    .field("body", def("Statement"));

  // The callee node of a dynamic import(...) expression.
  def("Import")
    .bases("Expression")
    .build();
};
