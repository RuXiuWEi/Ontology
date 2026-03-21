package com.ontology.backend.security;

import java.util.Set;

public final class RoleNames {

    public static final String ADMIN = "ADMIN";
    public static final String EDITOR = "EDITOR";
    public static final String VIEWER = "VIEWER";

    public static final Set<String> BUILTIN = Set.of(ADMIN, EDITOR, VIEWER);

    private RoleNames() {
    }
}
